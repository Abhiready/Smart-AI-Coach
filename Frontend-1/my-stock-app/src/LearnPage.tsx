// src/LearnPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  LinearProgress,
  Collapse,
  List,
  ListItemButton,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
} from "@mui/material";
import { School, CheckCircle } from "@mui/icons-material";

/* --- Types --- */
type ExternalLink = { title: string; href: string };
type QuizQ = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};
type Lesson = {
  id: number;
  title: string;
  content: string;
  links: ExternalLink[];
  quiz: QuizQ[];
};
type QuizResult = { qId: string; correct: boolean; chosen?: number };
type ProgressEntry = {
  lessonId: number;
  completedCount: number;
  lastScorePct: number;
  attempts: number;
  lastAttemptAt?: string;
};

const LS_KEY = "learn_progress_v2";

/* --- Helpers --- */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* --- Lessons (expanded pools) --- */
const LESSONS: Lesson[] = [
  {
    id: 1,
    title: "Understanding Market Emotions",
    content:
      "Learn how fear and greed influence decisions. Identify FOMO and Panic patterns in real trades.",
    links: [
      { title: "Behavioral Finance — Investopedia", href: "https://www.investopedia.com/terms/b/behavioralfinance.asp" },
      { title: "FOMO in Investing — Forbes", href: "https://www.forbes.com/advisor/investing/fomo-investing/" },
    ],
    quiz: [
      { id: "1a", question: "What does FOMO stand for?", options: ["Fear Of Missing Out","Focus On Market Opportunity","Flow Of Money Operations","Fundamental Opportunity Management"], correctIndex: 0, explanation: "FOMO stands for 'Fear Of Missing Out' — it causes impulsive trades when seeing others profit." },
      { id: "1b", question: "Which is a sign of panic selling?", options: ["Selling during news hype without checking fundamentals","Rebalancing calmly","Sticking to stop-loss rules","Gradually trimming profits"], correctIndex: 0, explanation: "Panic selling happens when investors exit positions emotionally." },
      { id: "1c", question: "Best immediate action if feeling FOMO on a pick?", options: ["Reduce size and re-evaluate thesis","Buy full position immediately","Ignore price action","Close all positions"], correctIndex: 0, explanation: "Reducing size and re-checking the thesis helps avoid impulsive mistakes." },
      { id: "1d", question: "Which habit reduces emotion-driven trades?", options: ["Using a written trade plan", "Following social media only", "Trading without stop loss", "Chasing every tip"], correctIndex: 0, explanation: "A written plan and clear rules reduces impulsive behavior." },
      { id: "1e", question: "Panic selling usually occurs when:", options: ["Markets fall quickly and emotions dominate","Long-term fundamentals improve","You rebalance periodically","Taxes are due"], correctIndex: 0 },
      { id: "1f", question: "What should you record to fight FOMO?", options: ["Entry thesis, target, stop","Only the ticker","Nothing","Only screenshots"], correctIndex: 0, explanation: "A short journal entry helps you remember why you traded." },
    ],
  },
  {
    id: 2,
    title: "Building a Diversified Portfolio",
    content:
      "Diversification reduces risk by investing across different sectors and asset classes.",
    links: [
      { title: "Diversification — Vanguard", href: "https://investor.vanguard.com/investing/asset-allocation" },
      { title: "Portfolio Diversification — Morningstar", href: "https://www.morningstar.com/lp/portfolio-diversification" },
    ],
    quiz: [
      { id: "2a", question: "Main benefit of diversification?", options: ["Eliminates all risk","Reduces company-specific risk","Guarantees returns","Avoids taxes"], correctIndex: 1, explanation: "It reduces company-specific risk, not market risk." },
      { id: "2b", question: "After large drift from targets you should:", options: ["Rebalance to target allocations","Ignore it","Double winners","Close portfolio"], correctIndex: 0 },
      { id: "2c", question: "A well diversified portfolio tends to:", options: ["Reduce volatility", "Increase single-stock risk", "Guarantee outperformance", "Eliminate fees"], correctIndex: 0 },
      { id: "2d", question: "Which helps diversification?", options: ["Different sectors and asset classes","One sector concentration","Invest only in one stock","Always use margin"], correctIndex: 0 },
      { id: "2e", question: "Why hold bonds in portfolio?", options: ["Lower overall volatility","Guarantee market beating returns","Avoid diversification","Make tax evasion easier"], correctIndex: 0 },
      { id: "2f", question: "If one sector is >40% you may:", options: ["Consider trimming to reduce concentration","Ignore and hold","Add more to that sector","Sell everything"], correctIndex: 0 },
    ],
  },
  {
    id: 3,
    title: "Interpreting AI Coach Feedback",
    content:
      "Learn what FOMO, PANIC, and NORMAL labels mean and how to improve your trading discipline.",
    links: [
      { title: "Trading Psychology — Investopedia", href: "https://www.investopedia.com/articles/trading/09/trading-psychology.asp" },
      { title: "Trade Journaling — Medium", href: "https://medium.com/" },
    ],
    quiz: [
      { id: "3a", question: "A 'FOMO' trade is usually triggered by:", options: ["Fundamental analysis","Peer pressure or hype","Stop-loss discipline","Rebalancing"], correctIndex: 1 },
      { id: "3b", question: "Why keep a trade journal?", options: ["Track emotions and learn","Avoid taxes","Predict markets perfectly","Time every entry"], correctIndex: 0, explanation: "Journals help reflection and improvement." },
      { id: "3c", question: "Coach labels (FOMO/PANIC) help you:", options: ["Understand behavioral bias","Guarantee profits","Replace risk management","Time market exactly"], correctIndex: 0 },
      { id: "3d", question: "An entry with no thesis is usually:", options: ["High risk","Better than research","Always correct","Tax efficient"], correctIndex: 0 },
      { id: "3e", question: "If labelled PANIC on a sell, you should first:", options: ["Check if stop was hit or fundamentals changed","Do more panic selling","Ignore and do nothing","Buy more without checking"], correctIndex: 0 },
      { id: "3f", question: "Best way to reduce repeat mistakes?", options: ["Review journal and set rules","Trade without plan","Follow tips blindly","Never review trades"], correctIndex: 0 },
    ],
  },
];

/* --- Component --- */
export default function LearnPage(): JSX.Element {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [progress, setProgress] = useState<Record<number, ProgressEntry>>({});
  const [quizLesson, setQuizLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<QuizQ[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  // After finishQuiz we open results dialog holding the summary
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [lastScore, setLastScore] = useState<{ correct: number; total: number } | null>(null);

  // Load saved progress
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const arr: ProgressEntry[] = JSON.parse(raw);
        const map: Record<number, ProgressEntry> = {};
        arr.forEach((p) => (map[p.lessonId] = p));
        setProgress(map);
      }
    } catch {
      // ignore parse error
    }
  }, []);

  // persist progress
  useEffect(() => {
    const arr = Object.values(progress);
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  }, [progress]);

  // Start quiz: we pick a randomized subset for each attempt
  const startQuiz = (lesson: Lesson) => {
    setQuizLesson(lesson);
    // Shuffle whole pool and pick up to 5 questions for variety
    const pool = shuffle(lesson.quiz);
    const pick = pool.slice(0, Math.min(5, pool.length));
    setQuestions(pick);
    setQIndex(0);
    setSelected(null);
    setResults([]);
    setFeedback(null);
  };

  // when user answers a question
  const handleAnswer = () => {
    if (selected === null) return;
    const q = questions[qIndex];
    const correct = selected === q.correctIndex;
    const newResults = [...results, { qId: q.id, correct, chosen: selected }];
    setResults(newResults);

    setFeedback(correct ? "✅ Correct!" : `❌ Wrong. ${q.explanation || ""}`);

    // advance or finish after small pause so user sees feedback
    setTimeout(() => {
      setFeedback(null);
      setSelected(null);
      if (qIndex + 1 < questions.length) {
        setQIndex((i) => i + 1);
      } else {
        // compute score from latest results (use newResults to be synchronous)
        const correctCount = newResults.filter((r) => r.correct).length;
        setLastScore({ correct: correctCount, total: newResults.length });
        setSummaryOpen(true);
        // record an attempt (but do NOT mark as completed automatically)
        if (quizLesson) {
          setProgress((p) => {
            const prev = p[quizLesson.id];
            const attempts = (prev?.attempts || 0) + 1;
            // we store lastScorePct but do NOT treat it as completed unless user marks completed
            const lastScorePct = Math.round((100 * correctCount) / (newResults.length || 1));
            return { ...p, [quizLesson.id]: { lessonId: quizLesson.id, completedCount: prev?.completedCount || 0, lastScorePct, attempts, lastAttemptAt: new Date().toISOString() } };
          });
        }
        // close quiz UI
        setQuizLesson(null);
      }
    }, 800);
  };

  // Called when user explicitly marks the lesson as completed (manual control)
  const markCompleted = (lessonId: number) => {
    const existing = progress[lessonId];
    const lastPct = existing?.lastScorePct ?? 0;
    const entry: ProgressEntry = {
      lessonId,
      completedCount: (existing?.completedCount || 0) + 1,
      lastScorePct: lastPct,
      attempts: existing?.attempts || 0,
      lastAttemptAt: new Date().toISOString(),
    };
    setProgress((p) => ({ ...p, [lessonId]: entry }));
    setSummaryOpen(false);
    setLastScore(null);
  };

  const overall = useMemo(() => {
    const total = LESSONS.length || 1;
    const passed = Object.values(progress).filter((p) => p.lastScorePct >= 60 && p.completedCount > 0).length;
    return (100 * passed) / total;
  }, [progress]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
        📘 Learn & Practice
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Learn key investing principles with varied quizzes. After a quiz, press "Mark as Completed" to record progress.
      </Typography>

      <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" } }}>
        {/* Lessons column */}
        <Box sx={{ flex: 2 }}>
          {LESSONS.map((lesson) => {
            const prog = progress[lesson.id];
            return (
              <Card key={lesson.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box>
                      <Typography variant="h6">{lesson.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Completed: {prog?.completedCount || 0} · Last score: {prog?.lastScorePct ?? "—"}%
                      </Typography>
                    </Box>

                    <Box>
                      <Button onClick={() => setExpanded(expanded === lesson.id ? null : lesson.id)}>
                        {expanded === lesson.id ? "Hide" : "View"}
                      </Button>
                      <Button variant="contained" sx={{ ml: 1 }} onClick={() => startQuiz(lesson)}>
                        Take Quiz
                      </Button>
                    </Box>
                  </Box>

                  <Collapse in={expanded === lesson.id}>
                    <Typography sx={{ mt: 1, mb: 1 }}>{lesson.content}</Typography>
                    <List dense>
                      {lesson.links.map((ln, i) => (
                        <ListItemButton key={i} component="a" href={ln.href} target="_blank" rel="noopener noreferrer">
                          <ListItemText primary={ln.title} secondary={ln.href} />
                        </ListItemButton>
                      ))}
                    </List>

                    <Box sx={{ mt: 1 }}>
                      <Button size="small" onClick={() => markCompleted(lesson.id)}>
                        Mark as Completed (manual)
                      </Button>
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        {/* Progress column */}
        <Box sx={{ width: { xs: "100%", md: 360 }, display: "flex", flexDirection: "column", gap: 2 }}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <School color="primary" sx={{ fontSize: 36 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Progress Tracker
                </Typography>
                <LinearProgress variant="determinate" value={overall} sx={{ mt: 1, height: 10, borderRadius: 5 }} />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {Math.round(overall)}% Complete
                </Typography>
              </Box>
            </Box>
          </Card>

          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Study Tips
            </Typography>
            <Box component="ul" sx={{ pl: 3, mt: 1 }}>
              <li>Answer varied questions — quizzes use a shuffled subset each time.</li>
              <li>Press "Mark as Completed" after you review explanations.</li>
              <li>Repeat until you consistently score high.</li>
            </Box>
            <Button
              variant="outlined"
              startIcon={<CheckCircle />}
              onClick={() => {
                if (window.confirm("Reset all progress?")) {
                  setProgress({});
                  localStorage.removeItem(LS_KEY);
                }
              }}
            >
              Reset Progress
            </Button>
          </Card>
        </Box>
      </Box>

      {/* Quiz dialog (in-question) */}
      <Dialog open={!!quizLesson} onClose={() => setQuizLesson(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{quizLesson?.title}</DialogTitle>
        <DialogContent>
          {questions.length > 0 && questions[qIndex] && (
            <>
              <Typography sx={{ mb: 1 }}>
                Question {qIndex + 1} / {questions.length}
              </Typography>
              <Typography sx={{ mb: 2, fontWeight: 500 }}>{questions[qIndex].question}</Typography>

              <RadioGroup value={selected !== null ? String(selected) : ""} onChange={(e) => setSelected(Number(e.target.value))}>
                {questions[qIndex].options.map((opt, idx) => (
                  <FormControlLabel key={idx} value={String(idx)} control={<Radio />} label={opt} />
                ))}
              </RadioGroup>

              {feedback && <Alert severity={feedback.startsWith("✅") ? "success" : "warning"} sx={{ mt: 2 }}>{feedback}</Alert>}
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setQuizLesson(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleAnswer} disabled={selected === null}>
            {qIndex + 1 < questions.length ? "Next" : "Finish"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Results dialog shown after quiz finishes */}
      <Dialog open={summaryOpen} onClose={() => { setSummaryOpen(false); setLastScore(null); }} maxWidth="xs" fullWidth>
        <DialogTitle>Quiz Results</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>
            {lastScore ? `You scored ${Math.round((100 * lastScore.correct) / lastScore.total)}% (${lastScore.correct}/${lastScore.total})` : "No score available."}
          </Typography>

          <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
            Review:
          </Typography>

          {results.length === 0 ? (
            <Typography color="text.secondary">No question data to show.</Typography>
          ) : (
            <Box>
              {results.map((r, i) => {
                // find question text from any lesson (safe approach)
                const qObj = LESSONS.flatMap((L) => L.quiz).find((q) => q.id === r.qId);
                return (
                  <Box key={r.qId} sx={{ mb: 1, p: 1, borderRadius: 1, backgroundColor: "#0b0b0b" }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{i + 1}. {qObj?.question ?? r.qId}</Typography>
                    <Typography sx={{ fontSize: 13, color: r.correct ? "green" : "orange" }}>
                      {r.correct ? "Correct" : "Incorrect"}
                    </Typography>
                    {qObj && !r.correct && qObj.explanation && (
                      <Typography variant="body2" sx={{ mt: 0.5 }} color="text.secondary">{qObj.explanation}</Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => { setSummaryOpen(false); setLastScore(null); }}>Close</Button>
          {/* Mark Completed will increment completedCount and use the latest stored lastScorePct */}
          <Button
            variant="contained"
            onClick={() => {
              if (!lastScore) return;
              // find lesson id from previous stored progress (we recorded attempts earlier)
              // fallback: if only one recent quiz, use quizLesson? But quizLesson is closed. We'll find the lesson that matches the question ids.
              const lessonId = (() => {
                // results reference Q ids. find which lesson contains the first qId
                const firstQ = results[0]?.qId || null;
                if (!firstQ) return null;
                for (const L of LESSONS) {
                  if (L.quiz.some((qq) => qq.id === firstQ)) return L.id;
                }
                return null;
              })();
              if (lessonId == null) {
                // as a fallback, just close
                setSummaryOpen(false);
                setLastScore(null);
                return;
              }
              markCompleted(lessonId);
            }}
          >
            Mark as Completed
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
