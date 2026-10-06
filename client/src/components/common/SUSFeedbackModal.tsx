import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, ClipboardList, HelpCircle, Download } from 'lucide-react';
import { analyticsLogger } from '../../services/analyticsLogger';

interface SUSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUS_QUESTIONS = [
  "I think that I would like to use this system frequently.",
  "I found the system unnecessarily complex.",
  "I thought the system was easy to use.",
  "I think that I would need the support of a technical person to be able to use this system.",
  "I found the various functions in this system were well integrated.",
  "I thought there was too much inconsistency in this system.",
  "I would imagine that most people would learn to use this system very quickly.",
  "I found the system very cumbersome to use.",
  "I felt very confident using the system.",
  "I needed to learn a lot of things before I could get going with this system."
];

export const SUSFeedbackModal: React.FC<SUSModalProps> = ({ isOpen, onClose }) => {
  const [responses, setResponses] = useState<number[]>(new Array(10).fill(3));
  const [submitted, setSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const calculateScore = (answers: number[]): number => {
    let sum = 0;
    for (let i = 0; i < answers.length; i++) {
      if (i % 2 === 0) {
        // Odd-numbered questions (1, 3, 5, 7, 9)
        sum += answers[i] - 1;
      } else {
        // Even-numbered questions (2, 4, 6, 8, 10)
        sum += 5 - answers[i];
      }
    }
    return sum * 2.5;
  };

  const handleScoreChange = (index: number, val: number) => {
    const updated = [...responses];
    updated[index] = val;
    setResponses(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const score = calculateScore(responses);
    setFinalScore(score);
    setSubmitted(true);

    // Save anonymously
    analyticsLogger.logEvent('sus_feedback_submitted', {
      susScore: score,
      responses,
      timestamp: new Date().toISOString()
    });
  };

  const handleDownloadResults = () => {
    const data = {
      instrument: "System Usability Scale (SUS) ISO 9241-11",
      submittedAt: new Date().toISOString(),
      susScore: finalScore,
      interpretation: (finalScore || 0) >= 80.3 ? "A (Excellent)" : ((finalScore || 0) >= 68 ? "B (Good / Above Average)" : "C / Below Average"),
      questionsAndAnswers: SUS_QUESTIONS.map((q, idx) => ({
        questionNumber: idx + 1,
        question: q,
        rating: responses[idx]
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sus_evaluation_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-surface-container-high border border-outline-variant/60 rounded-3xl max-w-2xl w-full p-6 shadow-2xl text-left my-8 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-primary/20 text-primary border border-primary/40">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-headline-md">
                  System Usability Scale (SUS) Questionnaire
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Anonymous evaluation questionnaire for the IEEE paper usability study
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto pr-1 py-4">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-on-surface-variant">
                    Please score each statement from <strong>1 (Strongly Disagree)</strong> to <strong>5 (Strongly Agree)</strong>. 
                    Your feedback is processed according to ISO 9241-11 usability benchmarks.
                  </p>
                </div>

                <div className="space-y-4">
                  {SUS_QUESTIONS.map((q, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20">
                      <p className="text-xs font-semibold text-white mb-2.5">
                        <span className="font-mono text-primary mr-1.5">{idx + 1}.</span>
                        {q}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-[10px] text-outline shrink-0 hidden sm:inline">Strongly Disagree</span>
                        <div className="flex items-center justify-between flex-1 max-w-xs mx-auto gap-2">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleScoreChange(idx, val)}
                              className={`w-8 h-8 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer ${
                                responses[idx] === val
                                  ? 'bg-primary text-on-primary shadow-lg scale-105'
                                  : 'bg-surface-container-high text-on-surface-variant hover:text-white hover:bg-surface-container-highest'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                        <span className="text-[10px] text-outline shrink-0 hidden sm:inline">Strongly Agree</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface-variant text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer shadow-lg hover:brightness-105"
                  >
                    Calculate SUS Score & Submit
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 rounded-3xl bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981]">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white font-headline-md">Thank You for Your Feedback!</h4>
                  <p className="text-xs text-on-surface-variant mt-1">Your anonymous evaluation has been logged.</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/40 max-w-sm w-full space-y-2 text-left">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-outline">Computed SUS Score:</span>
                    <span className="text-2xl font-bold font-mono text-primary">{finalScore?.toFixed(1)} / 100</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-outline">Industry Percentile:</span>
                    <span className="font-bold text-[#a5d0b9]">
                      {(finalScore || 0) >= 80.3 ? 'Grade A (Top 10%)' : ((finalScore || 0) >= 68 ? 'Grade B (Above Average)' : 'Grade C / Acceptable')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleDownloadResults}
                    className="px-4 py-2 rounded-xl bg-surface-container-highest hover:bg-white/10 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download JSON Record</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
