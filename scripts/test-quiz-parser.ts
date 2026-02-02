
import { parseQuizMarkdown } from '../src/lib/quiz-parser';

const testCases = [
  {
    name: "Standard Format",
    input: `1. Question 1
a) Option A
b) Option B

2. Question 2
a) Option A
b) Option B

Answer Key:
1. a
2. b`
  },
  {
    name: "Inline Answers (Not currently supported)",
    input: `1. Question 1
*a) Option A (Correct)
b) Option B

2. Question 2
a) Option A
b) Option B - correct`
  },
  {
    name: "Multiline Question",
    input: `1. Question 1 is very long
and spans multiple lines
like this.
a) Option A
b) Option B

Answer Key:
1. a`
  },
  {
    name: "Missing Header",
    input: `1. Question 1
a) A
b) B

1. a`
  },
  {
    name: "Mixed Formats",
    input: `Q1. Question 1
A. Option A
B. Option B

2) Question 2
a- Option A
b- Option B

Answer Key:
1: A
2 = b`
  }
];

testCases.forEach(tc => {
  console.log(`\n--- Testing: ${tc.name} ---`);
  const result = parseQuizMarkdown(tc.input);
  console.log("Questions found:", result.questions.length);
  console.log("Errors:", result.errors);
  if (result.questions.length > 0) {
      console.log("Sample Q1 Answer Index:", result.questions[0].correctAnswerIndex);
  }
});
