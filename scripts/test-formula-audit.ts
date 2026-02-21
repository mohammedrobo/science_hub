import { parseQuizText } from '../src/lib/quiz-parser';

const input = `
1. What is the derivative of $f(x) = x^3 + 2x^2 - 5x + 1$?
a) $f'(x) = 3x^2 + 4x - 5$
b) $f'(x) = x^2 + 2x - 5$
c) $f'(x) = 3x^2 + 2x - 5$
d) $f'(x) = x^3 + 4x - 5$

2. Evaluate $\\int_0^{\\pi} \\sin(x) dx$
a) $0$
b) $1$
c) $2$
d) $\\pi$

3. Simplify \\frac{x^2 - 4}{x - 2}
a) x + 2
b) x - 2
c) x^2 + 2
d) 2x

4. Balance \\ce{CH4 + O2 -> CO2 + H2O}
a) \\ce{CH4 + 2O2 -> CO2 + 2H2O}
b) \\ce{2CH4 + O2 -> CO2 + H2O}
c) \\ce{CH4 + O2 -> 2CO2 + H2O}
d) \\ce{CH4 + 3O2 -> CO2 + 3H2O}

5. What is the kinetic energy formula?
a) $E_k = \\frac{1}{2}mv^2$
b) $E_k = mv$
c) $E_k = mgh$
d) $E_k = \\frac{mv^2}{2g}$

6. True or False: $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$

7. The equation is $-\\frac{\\hbar^2}{2m}\\nabla^2\\psi + V\\psi = E\\psi$. What does \\psi represent?
a) Wave function
b) Probability
c) Energy eigenvalue
d) Potential energy

8. If \\Delta G < 0, the reaction is:
a) Spontaneous
b) Non-spontaneous
c) At equilibrium
d) Impossible

9. For H_2SO_4, what is the molecular weight?
a) 98 g/mol
b) 64 g/mol
c) 80 g/mol
d) 96 g/mol

10. What is $\\sum_{n=1}^{\\infty} \\frac{1}{n^2}$?
a) $\\frac{\\pi^2}{6}$
b) $\\pi$
c) $e$
d) $\\ln 2$

Answer Key:
1. a
2. c
3. a
4. a
5. a
6. True
7. a
8. a
9. a
10. a
`;

const r = parseQuizText(input);
console.log('=== RESULTS ===');
console.log('Questions:', r.questions.length);
console.log('Answered:', r.questions.filter(q => q.correctAnswerIndex !== -1).length);
console.log('Errors:', r.errors.length > 0 ? r.errors : 'None');
console.log('');

r.questions.forEach(q => {
  console.log(`Q${q.id} [${q.type}] ans=${q.correctAnswerIndex}`);
  console.log(`  Text: ${q.text.substring(0, 150)}`);
  
  // Check for formula preservation
  const text = q.text;
  if (text.includes('^') && !text.includes('$')) console.log('  ℹ️ Bare ^ (will be rendered by MathText)');
  if (text.includes('_') && !text.includes('$') && text.match(/[A-Za-z]_[A-Za-z0-9]/)) console.log('  ℹ️ Bare _ (will be rendered by MathText)');
  if (text.includes('\\frac')) console.log('  ✅ \\frac preserved');
  if (text.includes('\\ce{')) console.log('  ✅ \\ce{} preserved');
  if (text.includes('\\int')) console.log('  ✅ \\int preserved');
  if (text.includes('\\sum')) console.log('  ✅ \\sum preserved');
  if (text.includes('\\Delta')) console.log('  ✅ \\Delta preserved');
  if (text.includes('\\psi')) console.log('  ✅ \\psi preserved');
  if (text.includes('\\hbar')) console.log('  ✅ \\hbar preserved');
  if (text.includes('\\lim')) console.log('  ✅ \\lim preserved');
  if (text.includes('\\nabla')) console.log('  ✅ \\nabla preserved');
  
  q.options.forEach((o, i) => {
    const marker = i === q.correctAnswerIndex ? '✅' : '  ';
    console.log(`  ${marker} ${String.fromCharCode(97+i)}) ${o.substring(0, 80)}`);
  });
  console.log('');
});
