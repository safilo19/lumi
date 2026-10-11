// Shared quiz question shape, used by the /api/quiz route and the quiz page.
export type QuizQuestion = {
  question: string;
  options: string[]; // exactly 4
  answer: number; // 0-3 index of the correct option
  explanation: string;
};
