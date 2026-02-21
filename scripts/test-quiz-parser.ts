import { parseQuizText } from '../src/lib/quiz-parser';

// ════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE QUIZ PARSER TEST SUITE v2
// Tests: standard formats, LaTeX math, chemistry, physics, fill-blank,
//        nested formulas, Arabic + LaTeX, edge cases,
//        NEW: \left/\right, multi-line $, currency $, a-z options,
//        roman numeral options, Yes/No, Correct/Incorrect, explanations,
//        5-level nesting, electron configs, \cancel, \SI, advanced chemistry
// ════════════════════════════════════════════════════════════════════════════

interface TestCase {
    name: string;
    input: string;
    expect: {
        questionCount?: number;
        answeredCount?: number;
        types?: ('mcq' | 'true_false' | 'fill_blank')[];
        textContains?: { index: number; substring: string }[];
        optionContains?: { q: number; opt: number; substring: string }[];
        correctAnswer?: { index: number; answer: number }[];
        noErrors?: boolean;
        hasExplanation?: { index: number }[];
    };
}

const testCases: TestCase[] = [
    // ════════════ BASIC FORMATS ════════════
    {
        name: '01. Standard MCQ with Answer Key',
        input: `1. What is 2 + 2?
a) 3
b) 4
c) 5
d) 6

2. What is the capital of France?
a) London
b) Berlin
c) Paris
d) Madrid

Answer Key:
1. b
2. c`,
        expect: {
            questionCount: 2,
            answeredCount: 2,
            types: ['mcq', 'mcq'],
            correctAnswer: [
                { index: 0, answer: 1 },
                { index: 1, answer: 2 },
            ],
        },
    },

    {
        name: '02. True/False Questions',
        input: `1. The Earth is flat.
True / False

2. Water boils at 100\u00B0C at sea level.
True / False

Answer Key:
1. False
2. True`,
        expect: {
            questionCount: 2,
            answeredCount: 2,
            types: ['true_false', 'true_false'],
        },
    },

    {
        name: '03. Inline Answer Markers (\u2705 and *)',
        input: `1. Which planet is closest to the Sun?
a) Venus
*b) Mercury
c) Earth
d) Mars

2. How many continents are there?
a) 5
b) 6
c) 7 \u2705
d) 8`,
        expect: {
            questionCount: 2,
            answeredCount: 2,
            correctAnswer: [
                { index: 0, answer: 1 },
                { index: 1, answer: 2 },
            ],
        },
    },

    // ════════════ MATH / LATEX ════════════
    {
        name: '04. Basic LaTeX in Questions and Options ($...$)',
        input: `1. What is the value of $\\frac{6}{3}$?
a) $1$
b) $2$
c) $3$
d) $4$

2. Simplify $\\sqrt{144}$.
a) $10$
b) $11$
c) $12$
d) $13$

Answer Key:
1. b
2. c`,
        expect: {
            questionCount: 2,
            answeredCount: 2,
            textContains: [
                { index: 0, substring: '\\frac{6}{3}' },
                { index: 1, substring: '\\sqrt{144}' },
            ],
            correctAnswer: [
                { index: 0, answer: 1 },
                { index: 1, answer: 2 },
            ],
        },
    },

    {
        name: '05. Nested LaTeX \u2014 Fractions Inside Fractions',
        input: `1. Simplify $\\frac{\\frac{1}{2}}{\\frac{3}{4}}$.
a) $\\frac{2}{3}$
b) $\\frac{3}{2}$
c) $\\frac{1}{6}$
d) $\\frac{4}{3}$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\frac{\\frac{1}{2}}{\\frac{3}{4}}' },
            ],
        },
    },

    {
        name: '06. Block Math ($$...$$)',
        input: `1. Evaluate the following integral:
$$\\int_0^1 x^2 \\, dx$$
a) $\\frac{1}{2}$
b) $\\frac{1}{3}$
c) $\\frac{1}{4}$
d) $1$

Answer Key:
1. b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\int_0^1' },
            ],
        },
    },

    {
        name: '07. LaTeX with \\\\[...\\\\] Display Math',
        input: `1. Solve for x:
\\[x^2 - 5x + 6 = 0\\]
a) $x = 1, 6$
b) $x = 2, 3$
c) $x = -2, -3$
d) $x = 0, 5$

Answer Key:
1. b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: 'x^2 - 5x + 6 = 0' },
            ],
        },
    },

    {
        name: '08. LaTeX with \\\\(...\\\\) Inline Math',
        input: `1. If \\(f(x) = x^3\\), what is \\(f'(x)\\)?
a) \\(x^2\\)
b) \\(2x^2\\)
c) \\(3x^2\\)
d) \\(3x\\)

Answer Key:
1. c`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: 'f(x) = x^3' },
            ],
        },
    },

    {
        name: '09. Complex Nested Math \u2014 sqrt, frac, subscripts',
        input: `1. What is $\\sqrt{\\frac{x^{2}+1}{x_{n}}}$ when $x=3, n=2$?
a) $\\sqrt{5}$
b) $\\sqrt{\\frac{10}{3}}$
c) $\\frac{\\sqrt{10}}{\\sqrt{3}}$
d) $\\sqrt{10}$

Answer Key:
1. b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\sqrt{\\frac{x^{2}+1}{x_{n}}}' },
            ],
        },
    },

    {
        name: '10. Matrix / Environment LaTeX',
        input: `1. Find the determinant of the matrix:
$$\\begin{pmatrix} 2 & 1 \\\\ 3 & 4 \\end{pmatrix}$$
a) 5
b) 8
c) 11
d) 14

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\begin{pmatrix}' },
            ],
        },
    },

    {
        name: '11. Greek Letters and Math Symbols Outside Delimiters',
        input: `1. In the equation \\alpha + \\beta = \\gamma, if \\alpha = 30\u00B0 and \\beta = 60\u00B0, what is \\gamma?
a) 45\u00B0
b) 90\u00B0
c) 120\u00B0
d) 180\u00B0

Answer Key:
1. b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\alpha' },
                { index: 0, substring: '\\beta' },
                { index: 0, substring: '\\gamma' },
            ],
        },
    },

    // ════════════ CHEMISTRY ════════════
    {
        name: '12. Chemistry \u2014 \\ce{} Notation (mhchem)',
        input: `1. What is the balanced equation for the combustion of methane?
a) $\\ce{CH4 + O2 -> CO2 + H2O}$
b) $\\ce{CH4 + 2O2 -> CO2 + 2H2O}$
c) $\\ce{2CH4 + O2 -> 2CO2 + H2O}$
d) $\\ce{CH4 + 3O2 -> CO2 + 2H2O}$

Answer Key:
1. b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            optionContains: [
                { q: 0, opt: 0, substring: '\\ce{' },
                { q: 0, opt: 1, substring: '\\ce{' },
            ],
        },
    },

    {
        name: '13. Chemistry \u2014 Equilibrium and Kc',
        input: `1. For the reaction $\\ce{N2(g) + 3H2(g) <=> 2NH3(g)}$, the equilibrium expression is:
a) $K_c = \\frac{[\\ce{NH3}]^2}{[\\ce{N2}][\\ce{H2}]^3}$
b) $K_c = \\frac{[\\ce{N2}][\\ce{H2}]^3}{[\\ce{NH3}]^2}$
c) $K_c = \\frac{[\\ce{NH3}]}{[\\ce{N2}][\\ce{H2}]}$
d) $K_c = [\\ce{NH3}]^2$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\ce{N2(g)' },
            ],
        },
    },

    {
        name: '14. Chemistry \u2014 pH and Logarithms',
        input: `1. If $[\\ce{H+}] = 1 \\times 10^{-4}$ M, what is the pH?
a) 2
b) 3
c) 4
d) 5

2. Calculate $K_a$ if $\\ce{HA <=> H+ + A-}$ with $K_a = \\frac{[\\ce{H+}][\\ce{A-}]}{[\\ce{HA}]}$
a) Strong acid
b) Weak acid
c) Buffer
d) Neutral

Answer Key:
1. c
2. b`,
        expect: {
            questionCount: 2,
            answeredCount: 2,
        },
    },

    // ════════════ PHYSICS ════════════
    {
        name: '15. Physics \u2014 Vectors and Units',
        input: `1. If $\\vec{F} = m\\vec{a}$ and $m = 5$ kg, $a = 9.8$ m/s\u00B2, what is $|\\vec{F}|$?
a) $49$ N
b) $48$ N
c) $50$ N
d) $45$ N

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\vec{F}' },
                { index: 0, substring: '\\vec{a}' },
            ],
        },
    },

    {
        name: '16. Physics \u2014 Trigonometry and Angles',
        input: `1. A projectile is launched at $\\theta = 45\u00B0$ with $v_0 = 20$ m/s. What is the range?
$R = \\frac{v_0^2 \\sin(2\\theta)}{g}$
a) $\\approx 40.8$ m
b) $\\approx 20.4$ m
c) $\\approx 81.6$ m
d) $\\approx 10.2$ m

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\frac{v_0^2' },
            ],
        },
    },

    {
        name: '17. Physics \u2014 Thermodynamics with \\Delta',
        input: `1. For an ideal gas, $\\Delta U = nC_v\\Delta T$. If $n=2$ mol, $C_v = \\frac{3}{2}R$, and $\\Delta T = 100$ K:
a) $\\Delta U = 300R$
b) $\\Delta U = 150R$
c) $\\Delta U = 600R$
d) $\\Delta U = 100R$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
        },
    },

    // ════════════ FILL-IN-THE-BLANK ════════════
    {
        name: '18. Fill-in-the-Blank \u2014 Basic',
        input: `1. The chemical formula for water is _______.

2. The speed of light is approximately _______ m/s.

3. Newton's second law states that F = _______.

Answer Key:
1. H2O
2. 3 \u00D7 10^8
3. ma`,
        expect: {
            questionCount: 3,
            types: ['fill_blank', 'fill_blank', 'fill_blank'],
            answeredCount: 3,
        },
    },

    {
        name: '19. Fill-in-the-Blank \u2014 With LaTeX Answer',
        input: `1. The derivative of $x^3$ is _______.

2. The integral $\\int x \\, dx$ equals _______.

Answer Key:
1. $3x^2$
2. $\\frac{x^2}{2} + C$`,
        expect: {
            questionCount: 2,
            types: ['fill_blank', 'fill_blank'],
        },
    },

    {
        name: '20. Fill-in-the-Blank \u2014 [blank] Format',
        input: `1. The element with atomic number 6 is [blank].

2. The pH of pure water at 25\u00B0C is [blank].

Answer Key:
1. Carbon
2. 7`,
        expect: {
            questionCount: 2,
            types: ['fill_blank', 'fill_blank'],
            answeredCount: 2,
        },
    },

    // ════════════ MIXED FORMAT ════════════
    {
        name: '21. Mixed \u2014 MCQ + True/False + Fill-Blank in One Quiz',
        input: `1. Solve $x^2 = 16$:
a) $x = \\pm 2$
b) $x = \\pm 4$
c) $x = \\pm 8$
d) $x = 4$ only

2. The derivative of a constant is always zero.
True / False

3. The Pythagorean theorem states: $a^2 + b^2 =$ _______.

Answer Key:
1. b
2. True
3. $c^2$`,
        expect: {
            questionCount: 3,
            types: ['mcq', 'true_false', 'fill_blank'],
            answeredCount: 3,
        },
    },

    // ════════════ EDGE CASES ════════════
    {
        name: '22. LaTeX in Answer Key Values',
        input: `1. What is $\\frac{d}{dx}[x^2]$?
a) $x$
b) $2x$
c) $x^2$
d) $2x^2$

Answer Key:
1. b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\frac{d}{dx}' },
            ],
        },
    },

    {
        name: '23. Options with $ Signs That Are NOT LaTeX',
        input: `1. What is the price of the item after 10% discount on $50?
a) $45
b) $40
c) $35
d) $55

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
        },
    },

    {
        name: '24. LaTeX \\begin{align} Environment',
        input: `1. Which step is correct in solving the system?
$$\\begin{align} 2x + y &= 5 \\\\ x - y &= 1 \\end{align}$$
a) $x = 2, y = 1$
b) $x = 1, y = 3$
c) $x = 3, y = -1$
d) $x = 0, y = 5$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\begin{align}' },
            ],
        },
    },

    {
        name: '25. Multiple Superscripts and Subscripts Without $',
        input: `1. In the reaction CO_{2} + H_{2}O, what compound forms?
a) H_{2}CO_{3}
b) CO
c) O_{2}
d) H_{2}

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
        },
    },

    {
        name: '26. Arabic Quiz with LaTeX Math',
        input: `\u0627\u0644\u0633\u0624\u0627\u0644 1. \u0645\u0627 \u0642\u064A\u0645\u0629 $\\frac{6}{2}$\u061F
\u0623) $2$
\u0628) $3$
\u062C) $4$
\u062F) $1$

\u0627\u0644\u0625\u062C\u0627\u0628\u0627\u062A:
1. b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\frac{6}{2}' },
            ],
        },
    },

    {
        name: '27. Deeply Nested LaTeX \u2014 3 Levels',
        input: `1. Simplify: $\\frac{\\sqrt{\\frac{a^{2}+b^{2}}{c^{2}}}}{\\text{where } c \\neq 0}$
a) $\\frac{\\sqrt{a^2+b^2}}{c}$
b) $\\frac{a+b}{c}$
c) $\\sqrt{\\frac{a+b}{c}}$
d) $\\frac{a^2+b^2}{c}$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\frac{\\sqrt{\\frac{a^{2}+b^{2}}{c^{2}}}' },
            ],
        },
    },

    {
        name: '28. Standalone \\ce{} Without $ Delimiters',
        input: `1. Balance: \\ce{Fe + O2 -> Fe2O3}
a) \\ce{4Fe + 3O2 -> 2Fe2O3}
b) \\ce{2Fe + O2 -> Fe2O3}
c) \\ce{Fe + O2 -> FeO}
d) \\ce{3Fe + 2O2 -> Fe3O4}

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\ce{' },
            ],
        },
    },

    {
        name: '29. Mixed Inline Options with LaTeX',
        input: `1. Which is the quadratic formula?
a) $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$    b) $x = \\frac{b \\pm \\sqrt{b^2-4ac}}{2a}$
c) $x = \\frac{-b + \\sqrt{b^2-4ac}}{a}$    d) $x = \\frac{-b}{2a}$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
        },
    },

    {
        name: '30. LaTeX \\text{} Inside Math',
        input: `1. The formula for kinetic energy is $KE = \\frac{1}{2}mv^2$ where $m$ is mass in $\\text{kg}$ and $v$ is velocity in $\\text{m/s}$. What is KE when $m=2, v=3$?
a) $9 \\text{ J}$
b) $18 \\text{ J}$
c) $6 \\text{ J}$
d) $12 \\text{ J}$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
        },
    },

    {
        name: '31. Summation and Product Notation',
        input: `1. Evaluate $\\sum_{i=1}^{n} i = $?
a) $\\frac{n(n+1)}{2}$
b) $\\frac{n^2}{2}$
c) $n!$
d) $2^n$

2. What is $\\prod_{i=1}^{4} i$?
a) 10
b) 24
c) 16
d) 4

Answer Key:
1. a
2. b`,
        expect: {
            questionCount: 2,
            answeredCount: 2,
        },
    },

    {
        name: '32. Limits and Calculus',
        input: `1. Evaluate $\\lim_{x \\to 0} \\frac{\\sin x}{x}$:
a) 0
b) 1
c) $\\infty$
d) undefined

2. Find $\\frac{d}{dx}[e^{x^2}]$:
a) $e^{x^2}$
b) $2xe^{x^2}$
c) $x^2 e^{x^2}$
d) $2e^{x^2}$

Answer Key:
1. b
2. b`,
        expect: {
            questionCount: 2,
            answeredCount: 2,
            textContains: [
                { index: 0, substring: '\\lim_{x' },
            ],
        },
    },

    {
        name: '33. Multiline Question with LaTeX',
        input: `1. Given the function:
$f(x) = \\frac{x^3 - 2x^2 + x}{x - 1}$
Find the simplified form for $x \\neq 1$.
a) $x^2 - x$
b) $x^2 + x$
c) $x(x-1)$
d) $x$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\frac{x^3 - 2x^2 + x}{x - 1}' },
            ],
        },
    },

    {
        name: '34. Geology / Earth Science (No LaTeX)',
        input: `1. What type of rock is formed from cooled magma?
a) Sedimentary
b) Metamorphic
c) Igneous
d) Fossil

2. The Mohs scale measures:
a) Temperature
b) Hardness
c) Density
d) Color

Answer Key:
1. c
2. b`,
        expect: {
            questionCount: 2,
            answeredCount: 2,
            noErrors: true,
        },
    },

    {
        name: '35. Organic Chemistry \u2014 Functional Groups',
        input: `1. Which functional group is present in $\\ce{CH3COOH}$?
a) Hydroxyl ($\\ce{-OH}$)
b) Carboxyl ($\\ce{-COOH}$)
c) Amino ($\\ce{-NH2}$)
d) Aldehyde ($\\ce{-CHO}$)

Answer Key:
1. b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
        },
    },

    {
        name: '36. Descriptive Answer Key \u2014 letter) text format',
        input: `Lecture 3 Quiz: Atomic Orbitals & Atomic Properties

Part 1: Multiple Choice Questions (MCQ)

1. What is the characteristic shape of an s-orbital?
a) Dumbbell
b) Spherical
c) Cloverleaf
d) Square
2. Which of the following describes the shape of a p-orbital?
a) Spherical
b) Circular
c) Dumbbell
d) Linear
3. As the principal quantum number (n) increases, the size of the atomic orbital:
a) Decreases
b) Stays the same
c) Increases
d) Becomes zero
4. How many radial nodes are present in a 3s-orbital? (Using the formula n - 1)
a) 1
b) 2
c) 3
d) 0
5. A "nodal plane" is defined as an imaginary flat surface where the electron density is:
a) Maximum
b) Half of the total
c) Zero
d) Constant
6. Substances that are not attracted to magnets because all their electron spins are paired are called:
a) Paramagnetic
b) Ferromagnetic
c) Diamagnetic
d) Electromagnetic
7. Paramagnetic substances are weakly attracted to magnets because they contain:
a) Only paired electrons
b) No electrons
c) Unpaired electrons
d) Only neutrons
8. The actual positive charge felt by valence electrons after accounting for shielding is known as:
a) Total nuclear charge
b) Effective nuclear charge (Zeff)
c) Ionic charge
d) Magnetic charge
9. For a neutral fluorine atom (nuclear charge +9), the two core electrons shield the valence electrons. What is Zeff?
a) +9
b) +2
c) +7
d) 0
10. As you move across the periodic table from left to right, the effective nuclear charge:
a) Decreases
b) Increases
c) Remains constant
d) Becomes zero

Part 2: True or False

11. True or False: Atomic orbitals represent a volume of space where there is a certain probability of finding an electron.
12. True or False: For an s-orbital, the probability depends heavily on the specific direction from the nucleus.
13. True or False: The number of radial nodes in an ns orbital is calculated as (n - 1).
14. True or False: A p-subshell consists of three orbitals oriented at 90\u00B0 to each other.
15. True or False: Unlike s-orbitals, p-orbitals have directional properties.
16. True or False: Every electron spin creates a tiny magnetic field.
17. True or False: Except for hydrogen, the effective nuclear charge is always less than the full nuclear charge.
18. True or False: Inner shell electrons help to shield the positive charge of the nucleus from the outer electrons.
19. True or False: If you move beyond all the valence electrons of a neutral fluorine atom, the net effective charge is 0.
20. True or False: Effective nuclear charge is determined primarily by the difference between the nuclear charge and the core electron charge.

Answer Key

1. b) Spherical
2. c) Dumbbell
3. c) Increases
4. b) 2
5. c) Zero
6. c) Diamagnetic
7. c) Unpaired electrons
8. b) Effective nuclear charge (Zeff)
9. c) +7
10. b) Increases
11. True
12. False (s-orbitals are spherically symmetrical; direction does not matter)
13. True
14. True
15. True
16. True
17. True
18. True
19. True
20. True`,
        expect: {
            questionCount: 20,
            answeredCount: 20,
            types: [
                'mcq', 'mcq', 'mcq', 'mcq', 'mcq', 'mcq', 'mcq', 'mcq', 'mcq', 'mcq',
                'true_false', 'true_false', 'true_false', 'true_false', 'true_false',
                'true_false', 'true_false', 'true_false', 'true_false', 'true_false',
            ],
            correctAnswer: [
                { index: 0, answer: 1 },   // b
                { index: 1, answer: 2 },   // c
                { index: 2, answer: 2 },   // c
                { index: 3, answer: 1 },   // b
                { index: 4, answer: 2 },   // c
                { index: 5, answer: 2 },   // c
                { index: 6, answer: 2 },   // c
                { index: 7, answer: 1 },   // b
                { index: 8, answer: 2 },   // c
                { index: 9, answer: 1 },   // b
            ],
        },
    },

    // ════════════════════════════════════════════════════════════════
    // NEW TESTS — v5 PARSER FEATURES
    // ════════════════════════════════════════════════════════════════

    {
        name: '37. \\left/\\right Delimiters \u2014 Parentheses',
        input: `1. Simplify $\\left(\\frac{x}{y}\\right)^2$:
a) $\\frac{x^2}{y^2}$
b) $\\frac{x}{y^2}$
c) $\\frac{2x}{y}$
d) $\\frac{x^2}{y}$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\left(' },
                { index: 0, substring: '\\right)' },
            ],
        },
    },

    {
        name: '38. \\left/\\right with Brackets and Absolute Value',
        input: `1. Evaluate $\\left|\\frac{-3}{2}\\right| + \\left[\\frac{7}{3}\\right]$:
a) $\\frac{7}{2}$
b) $\\frac{11}{6}$
c) $\\frac{13}{6}$
d) $3$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\left|' },
                { index: 0, substring: '\\right|' },
            ],
        },
    },

    {
        name: '39. Currency $ vs LaTeX $ Disambiguation',
        input: `1. If an item costs $50 and tax is $\\frac{8}{100}$, what is the total?
a) $54
b) $53
c) $55
d) $52

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\frac{8}{100}' },
            ],
        },
    },

    {
        name: '40. Options Beyond h \u2014 Full Alphabet (a-l)',
        input: `1. Which element has atomic number 6?
a) Hydrogen
b) Helium
c) Lithium
d) Beryllium
e) Boron
f) Carbon
g) Nitrogen
h) Oxygen
i) Fluorine
j) Neon
k) Sodium
l) Magnesium

Answer Key:
1. f`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            correctAnswer: [
                { index: 0, answer: 5 },  // f = index 5
            ],
        },
    },

    {
        name: '41. Yes/No True-False Variant',
        input: `1. Is the Earth round?
Yes / No

2. Is the Sun a planet?
Yes / No

Answer Key:
1. Yes
2. No`,
        expect: {
            questionCount: 2,
            answeredCount: 2,
            types: ['true_false', 'true_false'],
        },
    },

    {
        name: '42. Correct/Incorrect True-False Variant',
        input: `1. Water freezes at 0 degrees Celsius.
Correct / Incorrect

2. The moon is bigger than the sun.
Correct / Incorrect

Answer Key:
1. Correct
2. Incorrect`,
        expect: {
            questionCount: 2,
            answeredCount: 2,
            types: ['true_false', 'true_false'],
        },
    },

    {
        name: '43. Right/Wrong True-False Variant',
        input: `1. Photosynthesis occurs in chloroplasts.
Right / Wrong

2. Humans have three lungs.
Right / Wrong

Answer Key:
1. Right
2. Wrong`,
        expect: {
            questionCount: 2,
            answeredCount: 2,
            types: ['true_false', 'true_false'],
        },
    },

    {
        name: '44. Answer Key with Explanations (\u2014 dash)',
        input: `1. Which planet has the most moons?
a) Jupiter
b) Saturn
c) Uranus
d) Neptune

2. What is the speed of light?
a) 300,000 km/s
b) 150,000 km/s
c) 200,000 km/s
d) 100,000 km/s

Answer Key:
1. b - Saturn has 146 confirmed moons as of 2024
2. a - The speed of light is approximately 299,792 km/s`,
        expect: {
            questionCount: 2,
            answeredCount: 2,
            correctAnswer: [
                { index: 0, answer: 1 },
                { index: 1, answer: 0 },
            ],
        },
    },

    {
        name: '45. \\cancel{} for Simplification',
        input: `1. Simplify $\\frac{\\cancel{x} \\cdot y}{\\cancel{x} \\cdot z}$:
a) $\\frac{y}{z}$
b) $\\frac{x}{z}$
c) $\\frac{y}{x}$
d) $yz$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\cancel{x}' },
            ],
        },
    },

    {
        name: '46. 5-Level Nested Fractions',
        input: `1. Evaluate $\\frac{\\frac{\\frac{\\frac{\\frac{1}{2}}{3}}{4}}{5}}{6}$:
a) $\\frac{1}{720}$
b) $\\frac{1}{360}$
c) $\\frac{1}{120}$
d) $\\frac{1}{60}$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\frac{\\frac{\\frac{\\frac{\\frac{1}{2}}{3}}{4}}{5}}{6}' },
            ],
        },
    },

    {
        name: '47. \\displaystyle and \\textstyle Modifiers',
        input: `1. Which rendering is correct for $\\displaystyle\\sum_{i=1}^{n} i^2$?
a) $\\frac{n(n+1)(2n+1)}{6}$
b) $\\frac{n(n+1)}{2}$
c) $n^2$
d) $\\frac{n^3}{3}$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\displaystyle' },
            ],
        },
    },

    {
        name: '48. \\mathbb and \\mathcal Commands',
        input: `1. The set of real numbers is denoted by:
a) $\\mathbb{R}$
b) $\\mathbb{Z}$
c) $\\mathcal{R}$
d) $\\mathfrak{R}$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: 'real numbers' },
            ],
            optionContains: [
                { q: 0, opt: 0, substring: '\\mathbb{R}' },
            ],
        },
    },

    {
        name: '49. \\begin{cases} Environment',
        input: `1. The function is defined as:
$$f(x) = \\begin{cases} x^2 & \\text{if } x \\geq 0 \\\\ -x & \\text{if } x < 0 \\end{cases}$$
What is $f(-3)$?
a) $9$
b) $3$
c) $-9$
d) $-3$

Answer Key:
1. b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\begin{cases}' },
            ],
        },
    },

    {
        name: '50. Numbered Sub-Options (1-12)',
        input: `1. Which of the following is a noble gas?
1) Hydrogen
2) Helium
3) Lithium
4) Beryllium
5) Boron
6) Carbon

Answer Key:
1. b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
        },
    },

    {
        name: '51. Embedded "True or False:" in Question Text',
        input: `1. True or False: The mitochondria is the powerhouse of the cell.

2. True or False: DNA stands for Deoxyribonucleic Acid.

Answer Key:
1. True
2. True`,
        expect: {
            questionCount: 2,
            answeredCount: 2,
            types: ['true_false', 'true_false'],
        },
    },

    {
        name: '52. T/F Answer Key with Explanations in Parentheses',
        input: `1. True or False: Light travels faster in water than in vacuum.
2. True or False: The chemical symbol for gold is Au.

Answer Key:
1. False (Light is slower in water due to refraction)
2. True (Au comes from the Latin word aurum)`,
        expect: {
            questionCount: 2,
            answeredCount: 2,
            types: ['true_false', 'true_false'],
        },
    },

    {
        name: '53. \\overset and \\underset Operators',
        input: `1. What does $\\overset{\\text{def}}{=}$ mean?
a) Approximately equal
b) Defined as
c) Greater than
d) Not equal

Answer Key:
1. b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\overset{' },
            ],
        },
    },

    {
        name: '54. \\SI{} Units (siunitx)',
        input: `1. The acceleration due to gravity is \\SI{9.8}{m/s^2}. What force acts on a 10 kg object?
a) 98 N
b) 49 N
c) 9.8 N
d) 19.6 N

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\SI{9.8}' },
            ],
        },
    },

    {
        name: '55. Nested \\left/\\right with \\frac Inside',
        input: `1. Simplify $\\left(\\frac{\\left(\\frac{a}{b}\\right)}{\\left(\\frac{c}{d}\\right)}\\right)$:
a) $\\frac{ad}{bc}$
b) $\\frac{ac}{bd}$
c) $\\frac{ab}{cd}$
d) $\\frac{cd}{ab}$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\left(' },
            ],
        },
    },

    {
        name: '56. Unicode Chemistry Symbols \u2014 Equilibrium Arrow',
        input: `1. The equilibrium symbol \u21CC indicates:
a) Forward reaction only
b) Reversible reaction
c) Irreversible reaction
d) No reaction

Answer Key:
1. b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
        },
    },

    {
        name: '57. \\overbrace and \\underbrace Annotations',
        input: `1. In $\\underbrace{a + a + \\cdots + a}_{n \\text{ times}} = na$, what is the value when $a=3, n=5$?
a) $8$
b) $15$
c) $12$
d) $25$

Answer Key:
1. b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\underbrace{' },
            ],
        },
    },

    {
        name: '58. \\lfloor \\rfloor and \\lceil \\rceil Symbols',
        input: `1. What is $\\lfloor 3.7 \\rfloor + \\lceil 2.1 \\rceil$?
a) 5
b) 6
c) 7
d) 4

Answer Key:
1. b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\lfloor' },
                { index: 0, substring: '\\rceil' },
            ],
        },
    },

    {
        name: '59. \\boxed{} Answer Highlighting',
        input: `1. The solution is $\\boxed{x = 5}$. Which equation has this solution?
a) $x + 3 = 8$
b) $x - 3 = 8$
c) $2x = 8$
d) $x^2 = 25$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\boxed{x = 5}' },
            ],
        },
    },

    {
        name: '60. Multi-line $ delimiter spanning 2 lines',
        input: `1. Consider the equation $x^2 +
2x + 1 = 0$. How many real roots does it have?
a) 0
b) 1
c) 2
d) 3

Answer Key:
1. b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: 'x^2' },
            ],
        },
    },

    {
        name: '61. Yes/No Section Header Detection',
        input: `Yes or No

1. Is water wet?
2. Is fire cold?
3. Is the sky blue?

Answer Key:
1. Yes
2. No
3. Yes`,
        expect: {
            questionCount: 3,
            answeredCount: 3,
            types: ['true_false', 'true_false', 'true_false'],
        },
    },

    // ════════════ FORMULA & MARKDOWN ROBUSTNESS ════════════

    {
        name: '62. Bold-Wrapped Question with * Multiplication in Formula',
        input: `**1. What is the result of $a * b * c$?**
a) $abc$
b) $a + b + c$
c) $a \\times b \\times c$
d) $a / b / c$

Answer Key:
1. c`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: 'a * b * c' },
            ],
            correctAnswer: [{ index: 0, answer: 2 }],
        },
    },

    {
        name: '63. Multi-line Bare \\frac Split Across Lines (AI Output)',
        input: `1. Simplify \\frac
{x^2 + 2x}
{x}
a) $x + 2$
b) $x$
c) $2x$
d) $x^2$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\frac' },
            ],
        },
    },

    {
        name: '64. Long Inline Formula (>500 chars, <2000)',
        input: `1. Evaluate $\\frac{\\sqrt{a^2 + b^2 + c^2 + d^2 + e^2 + f^2 + g^2 + h^2 + i^2 + j^2 + k^2 + l^2 + m^2 + n^2 + o^2 + p^2 + q^2 + r^2 + s^2 + t^2 + u^2 + v^2 + w^2 + x^2 + y^2 + z^2 + \\alpha^2 + \\beta^2 + \\gamma^2 + \\delta^2 + \\epsilon^2 + \\zeta^2 + \\eta^2 + \\theta^2 + \\iota^2 + \\kappa^2 + \\lambda^2 + \\mu^2 + \\nu^2 + \\xi^2 + \\pi^2 + \\rho^2 + \\sigma^2 + \\tau^2 + \\upsilon^2 + \\phi^2 + \\chi^2 + \\psi^2 + \\omega^2}}{2}$:
a) A constant
b) A variable
c) Depends on values
d) Undefined

Answer Key:
1. c`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\omega^2' },
                { index: 0, substring: '\\alpha^2' },
            ],
        },
    },

    {
        name: '65. Fenced Code Block Quiz (Markdown ```)',
        input: `\`\`\`
1. What is $\\Delta G$?
a) Gibbs free energy change
b) Enthalpy change
c) Entropy change
d) Internal energy change

Answer Key:
1. a
\`\`\``,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\Delta G' },
            ],
        },
    },

    {
        name: '66. Blockquote-Formatted Quiz (> markers)',
        input: `> 1. What is $\\vec{F} = m\\vec{a}$ known as?
> a) Newton's First Law
> b) Newton's Second Law
> c) Newton's Third Law
> d) Law of Gravitation
>
> Answer Key:
> 1. b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\vec{F}' },
            ],
            correctAnswer: [{ index: 0, answer: 1 }],
        },
    },

    {
        name: '67. Chemistry — Organic Reaction with \\ce{} Multi-line',
        input: `1. What is the product of the reaction $\\ce{CH3CH2OH ->[\\text{H2SO4}][\\text{170°C}] ?}$
a) $\\ce{CH2=CH2}$
b) $\\ce{CH3OCH3}$
c) $\\ce{CH3CHO}$
d) $\\ce{CH3COOH}$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\ce{' },
            ],
        },
    },

    {
        name: '68. Physics — Maxwell Equations with \\nabla and \\partial',
        input: `1. Which Maxwell equation represents Gauss's law?
a) $\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\epsilon_0}$
b) $\\nabla \\cdot \\vec{B} = 0$
c) $\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}$
d) $\\nabla \\times \\vec{B} = \\mu_0 \\vec{J}$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: 'Gauss' },
            ],
            optionContains: [
                { q: 0, opt: 0, substring: '\\nabla' },
                { q: 0, opt: 2, substring: '\\partial' },
            ],
        },
    },

    {
        name: '69. Mixed Bold + Italic + Formula — Stress Test',
        input: `**1. If $f(x) = x^2$, find $f'(x)$.**
**a)** $x$
**b)** $2x$
**c)** $x^2$
**d)** $2x^2$

**Answer Key:**
**1.** b`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: "f(x) = x^2" },
                { index: 0, substring: "f'(x)" },
            ],
            correctAnswer: [{ index: 0, answer: 1 }],
        },
    },

    {
        name: '70. Chemistry — Thermodynamics with \\Delta H, \\Delta S, \\Delta G',
        input: `1. For $\\Delta G = \\Delta H - T\\Delta S$, if $\\Delta H = -100$ kJ/mol and $\\Delta S = 200$ J/(mol·K) at T = 298 K, is the reaction spontaneous?
a) Yes, $\\Delta G < 0$
b) No, $\\Delta G > 0$
c) At equilibrium
d) Cannot determine

2. True or False: An exothermic reaction always has $\\Delta G < 0$.

Answer Key:
1. a
2. False`,
        expect: {
            questionCount: 2,
            answeredCount: 2,
            types: ['mcq', 'true_false'],
            textContains: [
                { index: 0, substring: '\\Delta G' },
                { index: 0, substring: '\\Delta H' },
            ],
        },
    },

    {
        name: '71. Physics — Schrödinger Equation with \\hbar and \\psi',
        input: `1. The time-independent Schrödinger equation is $-\\frac{\\hbar^2}{2m}\\frac{d^2\\psi}{dx^2} + V(x)\\psi = E\\psi$. What does $\\psi$ represent?
a) Wave function
b) Probability
c) Energy
d) Momentum

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\hbar' },
                { index: 0, substring: '\\psi' },
            ],
        },
    },

    {
        name: '72. Math — Integral with \\int, \\sum, and Nested Fractions',
        input: `1. Evaluate $\\int_0^{\\infty} \\frac{\\sum_{n=0}^{\\infty} \\frac{(-1)^n x^{2n}}{(2n)!}}{x^2 + 1} dx$:
a) $\\frac{\\pi}{2}$
b) $\\pi$
c) $\\frac{\\pi}{4}$
d) $2\\pi$

Answer Key:
1. a`,
        expect: {
            questionCount: 1,
            answeredCount: 1,
            textContains: [
                { index: 0, substring: '\\int_0^{\\infty}' },
                { index: 0, substring: '\\sum_{n=0}' },
            ],
        },
    },
];

// ════════════════════ TEST RUNNER ════════════════════

let passed = 0;
let failed = 0;
const failures: string[] = [];

for (const tc of testCases) {
    const result = parseQuizText(tc.input);
    const errors: string[] = [];

    // Check question count
    if (tc.expect.questionCount !== undefined && result.questions.length !== tc.expect.questionCount) {
        errors.push(`  questionCount: expected ${tc.expect.questionCount}, got ${result.questions.length}`);
    }

    // Check answered count
    if (tc.expect.answeredCount !== undefined) {
        const actual = result.questions.filter(q => q.correctAnswerIndex !== -1).length;
        if (actual !== tc.expect.answeredCount) {
            errors.push(`  answeredCount: expected ${tc.expect.answeredCount}, got ${actual}`);
        }
    }

    // Check types
    if (tc.expect.types) {
        for (let i = 0; i < tc.expect.types.length; i++) {
            if (i < result.questions.length && result.questions[i].type !== tc.expect.types[i]) {
                errors.push(`  Q${i + 1} type: expected '${tc.expect.types[i]}', got '${result.questions[i].type}'`);
            }
        }
    }

    // Check text contains
    if (tc.expect.textContains) {
        for (const { index, substring } of tc.expect.textContains) {
            if (index < result.questions.length) {
                if (!result.questions[index].text.includes(substring)) {
                    errors.push(`  Q${index + 1} text missing: "${substring}"\n    actual: "${result.questions[index].text.substring(0, 150)}..."`);
                }
            }
        }
    }

    // Check option contains
    if (tc.expect.optionContains) {
        for (const { q, opt, substring } of tc.expect.optionContains) {
            if (q < result.questions.length && opt < result.questions[q].options.length) {
                if (!result.questions[q].options[opt].includes(substring)) {
                    errors.push(`  Q${q + 1} option ${opt} missing: "${substring}"\n    actual: "${result.questions[q].options[opt]}"`);
                }
            }
        }
    }

    // Check correct answers
    if (tc.expect.correctAnswer) {
        for (const { index, answer } of tc.expect.correctAnswer) {
            if (index < result.questions.length && result.questions[index].correctAnswerIndex !== answer) {
                errors.push(`  Q${index + 1} correctAnswer: expected ${answer}, got ${result.questions[index].correctAnswerIndex}`);
            }
        }
    }

    // Check no errors
    if (tc.expect.noErrors && result.errors.length > 0) {
        errors.push(`  Expected no errors, got: ${result.errors.join('; ')}`);
    }

    // Check explanations
    if (tc.expect.hasExplanation) {
        for (const { index } of tc.expect.hasExplanation) {
            if (index < result.questions.length) {
                if (!(result.questions[index] as any).explanation) {
                    errors.push(`  Q${index + 1} missing explanation`);
                }
            }
        }
    }

    if (errors.length === 0) {
        console.log(`  \u2705 ${tc.name}`);
        passed++;
    } else {
        console.log(`  \u274C ${tc.name}`);
        for (const e of errors) console.log(e);
        if (result.errors.length > 0) {
            console.log(`  Parser errors: ${result.errors.join('; ')}`);
        }
        // Debug: show first 3 questions
        for (let qi = 0; qi < Math.min(3, result.questions.length); qi++) {
            const q = result.questions[qi];
            console.log(`  [DEBUG Q${qi+1}] type=${q.type} answer=${q.correctAnswerIndex} opts=${q.options.length} text="${q.text.substring(0,80)}..."`);
        }
        failures.push(tc.name);
        failed++;
    }
}

// ════════════════════ SUMMARY ════════════════════

console.log('\n' + '\u2550'.repeat(60));
console.log(`  RESULTS: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
if (failures.length > 0) {
    console.log(`  FAILED: ${failures.join(', ')}`);
}
console.log('\u2550'.repeat(60) + '\n');

process.exit(failed > 0 ? 1 : 0);
