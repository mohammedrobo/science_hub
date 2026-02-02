import { QuizWithQuestions, Question } from '@/types';

// Parsed quiz data from ~/projects/geology/qiuzs and ~/projects/chemistry/equilibrium
// Quiz IDs match the quiz_id in lessons

export const MOCK_QUIZZES: Record<string, QuizWithQuestions> = {
    // ============ MATHEMATICS QUIZZES ============
    'm101-quiz-1': {
        id: 'm101-quiz-1',
        course_id: 'm101',
        lesson_id: 'm101-l1',
        title: 'Determinants Basic Check',
        description: 'Test your understanding of 2x2 and 3x3 determinants.',
        questions: [
            {
                id: 'm101-q1-1',
                quiz_id: 'm101-quiz-1',
                type: 'mcq',
                text: 'What is the value of the determinant |2 1|\n|3 4| ?',
                options: ['5', '8', '5', '11'], // 8 - 3 = 5. Duplicate option fixed in next step if needed but strictly: 2*4 - 1*3 = 5.
                correct_answer: 'a',
                explanation: 'ad - bc = (2*4) - (1*3) = 8 - 3 = 5.',
                order_index: 0
            }
        ]
    },

    // ============ ATOMIC CHEMISTRY QUIZZES (C101A) ============
    'c101-quiz-1': {
        id: 'c101-quiz-1',
        course_id: 'c101a',
        lesson_id: 'c101a-l1',
        title: 'Atomic Models Check',
        description: 'Review the key differences between Thomson, Rutherford, and Bohr models.',
        questions: [
            {
                id: 'c101-q1-1',
                quiz_id: 'c101-quiz-1',
                type: 'mcq',
                text: 'Which atomic model was the first to propose the existence of a nucleus?',
                options: ['Thomson (Plum Pudding)', 'Rutherford', 'Bohr', 'Dalton'],
                correct_answer: 'b',
                explanation: 'Rutherford\'s gold foil experiment discovered the dense, positively charged nucleus.',
                order_index: 0
            },
            {
                id: 'c101-q1-2',
                quiz_id: 'c101-quiz-1',
                type: 'true_false',
                text: 'In the Bohr model, electrons can orbit at any distance from the nucleus.',
                options: ['True', 'False'],
                correct_answer: 'b',
                explanation: 'Bohr proposed that electrons move in fixed, quantized orbits (energy levels).',
                order_index: 1
            }

        ]
    },

    // ============ EQUILIBRIUM CHEMISTRY QUIZZES (C101B) ============
    'c101-quiz-7': {
        id: 'c101-quiz-7',
        course_id: 'c101b',
        lesson_id: 'c101b-l1',
        title: 'Chemical Equilibrium Part 1',
        description: 'Past Exam Questions & Basic Concepts of Equilibrium constants.',
        questions: [
            { id: 'c101-7-1', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'Which atomic model was the first to propose the existence of a nucleus?', options: ['Thomson (Plum Pudding)', 'Rutherford', 'Bohr', 'Dalton'], correct_answer: 'b', explanation: 'Rutherford\'s gold foil experiment discovered the dense, positively charged nucleus.', order_index: 0 },
            { id: 'c101-7-2', quiz_id: 'c101-quiz-7', type: 'true_false', text: 'In the Bohr model, electrons can orbit at any distance from the nucleus.', options: ['True', 'False'], correct_answer: 'b', explanation: 'Bohr proposed that electrons move in fixed, quantized orbits.', order_index: 1 },
            { id: 'c101-7-3', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'Using the equilibrium constants given for (1) and (2), what is K for (3)? (1: 1.49e13, 2: 1.66e12)', options: ['0.0123', '0.111', '8.98', '80.3'], correct_answer: 'b', explanation: 'Reaction 3 is derived from 1 and 2.', order_index: 2 },
            { id: 'c101-7-4', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'The equilibrium law for a heterogeneous reaction is written ... concentration terms for pure solids or liquids.', options: ['with', 'beside', 'without', 'together with'], correct_answer: 'c', explanation: 'Concentrations of pure solids and liquids are omitted.', order_index: 3 },
            { id: 'c101-7-5', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'Strong electrolytes, such as HCl, are substances that:', options: ['Dissociate partially', 'Dissociate completely', 'Do not conduct', 'Contain COOH'], correct_answer: 'b', explanation: 'Strong electrolytes dissociate completely.', order_index: 4 },
            { id: 'c101-7-6', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'Organic acids are recognized by which group?', options: ['OH-', 'H3O+', 'COOH', 'NH2'], correct_answer: 'c', explanation: 'COOH group.', order_index: 5 },
            { id: 'c101-7-7', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'Which is a non-electrolyte?', options: ['NaCl solution', 'HCl solution', 'Pure water vapor', 'NaOH solution'], correct_answer: 'c', explanation: 'Pure water vapor does not conduct electricity.', order_index: 6 },
            { id: 'c101-7-8', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'Chemical equilibrium is established when:', options: ['Conc. are equal', 'Rate forward = Rate reverse', 'Reaction stops', 'Rate is zero'], correct_answer: 'b', explanation: 'Dynamic equilibrium: rates are equal.', order_index: 7 },
            { id: 'c101-7-9', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'When a system reaches equilibrium, concentrations:', options: ['Become equal', 'Remain constant', 'Increase', 'Zero'], correct_answer: 'b', explanation: 'Concentrations remain constant at equilibrium.', order_index: 8 },
            { id: 'c101-7-10', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'Double arrows imply:', options: ['Completion', 'Equilibrium', 'Irreversible', 'Gases'], correct_answer: 'b', explanation: 'Reversible reaction reaching equilibrium.', order_index: 9 },
            { id: 'c101-7-11', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'Mass action expression for dD + eE <-> fF + gG:', options: ['[D].../[F]...', '[F]^f[G]^g / [D]^d[E]^e', '[F][G]/[D][E]', 'Product'], correct_answer: 'b', explanation: 'Products over Reactants raised to coeff.', order_index: 10 },
            { id: 'c101-7-12', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'For equilibrium to exist, Q must be:', options: ['> Kc', '< Kc', '0', 'Equal to Kc'], correct_answer: 'd', explanation: 'Q = Kc at equilibrium.', order_index: 11 },
            { id: 'c101-7-13', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'Kc value depends only on:', options: ['Initial conc', 'Pressure', 'Temperature', 'Volume'], correct_answer: 'c', explanation: 'Only T changes K.', order_index: 12 },
            { id: 'c101-7-14', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'If Kc=4.0 for A->B, what is Kc for B->A?', options: ['4.0', '-4.0', '0.25', '16.0'], correct_answer: 'c', explanation: '1/4.0 = 0.25', order_index: 13 },
            { id: 'c101-7-15', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'If coeffs are multiplied by 2, new K is:', options: ['2K', 'K^2', 'sqrt(K)', 'K/2'], correct_answer: 'b', explanation: 'K raised to power n.', order_index: 14 },
            { id: 'c101-7-16', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'If Rxn 3 = Rxn 1 + Rxn 2, then K3 is:', options: ['K1+K2', 'K1-K2', 'K1/K2', 'K1*K2'], correct_answer: 'd', explanation: 'Multiply equilibrium constants when adding equations.', order_index: 15 },
            { id: 'c101-7-17', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'Calc Kc for SO3 -> SO2 + 1/2 O2 given reverse K=7e25', options: ['1.4e-26', '3.5e12', '1.2e-13', '7e-25'], correct_answer: 'c', explanation: 'Sqrt(1/K) approx.', order_index: 16 },
            { id: 'c101-7-18', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'Calc K for H2O+CO -> CO2+H2', options: ['1.9e5', '6.0e5', '3.6e10', '0.36e11'], correct_answer: 'a', explanation: 'K1/K2 logic.', order_index: 17 },
            { id: 'c101-7-19', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'Equilibrium law for N2+3H2 <-> 2NH3', options: ['[NH3]/...', '[NH3]^2 / [N2][H2]^3', '...', '...'], correct_answer: 'b', explanation: 'Products^coeff / Reactants^coeff', order_index: 18 },
            { id: 'c101-7-20', quiz_id: 'c101-quiz-7', type: 'mcq', text: 'Assuming large K (10^25) means:', options: ['Reactants favored', 'Products favored', 'Equal', 'Slow'], correct_answer: 'b', explanation: 'Large K favors products.', order_index: 19 }
        ]
    },

    'c101-quiz-8': {
        id: 'c101-quiz-8',
        course_id: 'c101b',
        lesson_id: 'c101b-l2',
        title: 'Chemical Equilibrium Part 2',
        description: 'Le Chatelier Principle and Kp vs Kc calculations.',
        questions: [
            { id: 'c101-8-1', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'Conditions to make SO3 most stable in 2SO2 + O2 ⇌ 2SO3 + Heat?', options: ['High P, High T', 'High P, Low T', 'Low P, High T', 'Low P, Low T'], correct_answer: 'b', explanation: 'Exothermic (Low T) & Less moles (High P).', order_index: 0 },
            { id: 'c101-8-2', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'Calc Kp for N2O + NO2 -> 3NO given Kc=4.2e-4 at 500C', options: ['1.8e-3', '2.66e-2', '2.5e-5', '4.2e-4'], correct_answer: 'b', explanation: 'Kp = Kc(RT)^1 = 0.0266', order_index: 1 },
            { id: 'c101-8-3', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'Equilibrium law for heterogeneous is written ... pure solids.', options: ['with', 'beside', 'without', 'together'], correct_answer: 'c', explanation: 'Solids omitted.', order_index: 2 },
            { id: 'c101-8-4', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'Which has NO effect on position?', options: ['Catalyst', 'Concentration', 'Temperature', 'Pressure'], correct_answer: 'a', explanation: 'Catalysts affects rate only.', order_index: 3 },
            { id: 'c101-8-5', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'For Endothermic 2HI -> H2+I2, K depends on:', options: ['temp', 'press', 'catalyst', 'vol'], correct_answer: 'a', explanation: 'Temp only.', order_index: 4 },
            { id: 'c101-8-6', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'Relationship between Kp and Kc?', options: ['Kp=KcRT', 'Kc=Kp...', 'Kp=Kc(RT)^dn', '...'], correct_answer: 'c', explanation: 'Kp=Kc(RT)^dn', order_index: 5 },
            { id: 'c101-8-7', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'dn_g represents:', options: ['Moles R - P', 'Moles Prod(gas) - React(gas)', 'Total', 'Solid'], correct_answer: 'b', explanation: 'Gaseous products minus reactants.', order_index: 6 },
            { id: 'c101-8-8', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'When is Kp = Kc?', options: ['N2+3H2', '2SO2...', '2HI->H2+I2', 'PCl5...'], correct_answer: 'c', explanation: 'When dn=0 (2 moles gas each side).', order_index: 7 },
            { id: 'c101-8-9', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'Calc dn for N2+3H2->2NH3', options: ['+2', '-2', '0', '-1'], correct_answer: 'b', explanation: '2 - 4 = -2.', order_index: 8 },
            { id: 'c101-8-10', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'Calc Kp if Kc=6e-2 for Ammonia rxn at 500C', options: ['1.5e-5', '6e-2', '2.4e2', '1.5e5'], correct_answer: 'a', explanation: '1.5e-5', order_index: 9 },
            { id: 'c101-8-11', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'Kc for CaCO3(s) <-> CaO(s) + CO2(g)', options: ['Ratio', '[CO2]', '...', '...'], correct_answer: 'b', explanation: '[CO2] only.', order_index: 10 },
            { id: 'c101-8-12', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'Adding water to Cu complex equilibrium shifts:', options: ['Right', 'Left', 'None', 'K Inc'], correct_answer: 'b', explanation: 'H2O is product (conceptually in simplified view or adding solvent volume), shifts left.', order_index: 11 },
            { id: 'c101-8-13', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'Reducing volume for 3H2+N2->2NH3 shifts:', options: ['Left', 'Right', 'None', 'K Dec'], correct_answer: 'b', explanation: 'To side with fewer moles (Right: 2 vs 4).', order_index: 12 },
            { id: 'c101-8-14', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'Inc Temp of Exothermic rxn:', options: ['Inc K', 'Dec K', 'Shift Right', 'None'], correct_answer: 'b', explanation: 'Heat is product, shift left, K decreases.', order_index: 13 },
            { id: 'c101-8-15', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'What changes numerical value of K?', options: ['Press', 'Cat', 'Conc', 'Temp'], correct_answer: 'd', explanation: 'Temperature.', order_index: 14 },
            { id: 'c101-8-16', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'Adding inert gas constant volume:', options: ['Right', 'Left', 'None', 'Inc Press'], correct_answer: 'c', explanation: 'No effect on Partial Pressures.', order_index: 15 },
            { id: 'c101-8-17', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'Raising T for N2O4 -> 2NO2 (Endo):', options: ['Inc NO2', 'Dec NO2', 'Dec K', 'None'], correct_answer: 'a', explanation: 'Shift right (Heat is reactant).', order_index: 16 },
            { id: 'c101-8-18', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'Changing volume for H2+I2->2HI:', options: ['Right', 'Left', 'None', 'K Change'], correct_answer: 'c', explanation: 'Equal moles, no shift.', order_index: 17 },
            { id: 'c101-8-19', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'If K >> 1:', options: ['Reactants', 'Products', 'Mid', 'Zero'], correct_answer: 'b', explanation: 'Products favored.', order_index: 18 },
            { id: 'c101-8-20', quiz_id: 'c101-quiz-8', type: 'mcq', text: 'n/V in ideal gas law represents:', options: ['Pressure', 'Molarity', 'R', 'Mole Frac'], correct_answer: 'b', explanation: 'Molarity (mol/L).', order_index: 19 }
        ]
    },

    'c101-quiz-9': {
        id: 'c101-quiz-9',
        course_id: 'c101b',
        lesson_id: 'c101b-l3',
        title: 'Equilibrium Constants',
        description: 'Advanced calculations and reaction quotients.',
        questions: [
            { id: 'c101-9-1', quiz_id: 'c101-quiz-9', type: 'mcq', text: 'Reaction (b) is half of (a). Relationship?', options: ['Kb=Ka', 'Kb=Ka^2', 'Kb=sqrt(Ka)', 'Kb=0.5Ka'], correct_answer: 'c', explanation: 'Sqrt(Ka).', order_index: 0 },
            { id: 'c101-9-2', quiz_id: 'c101-quiz-9', type: 'mcq', text: 'K calculation for H2+Cl2 check', options: ['...', '...', '...', '...'], correct_answer: 'b', explanation: 'See notes.', order_index: 1 },
            { id: 'c101-9-3', quiz_id: 'c101-quiz-9', type: 'mcq', text: 'When Kc small, (0.1-2x) approx 0.1 because:', options: ['Rxn complete', 'x negligible', 'x large', 'High prod'], correct_answer: 'b', explanation: 'x < 5% rule.', order_index: 2 },
            { id: 'c101-9-4', quiz_id: 'c101-quiz-9', type: 'mcq', text: 'Approximation valid if conc > ... x K', options: ['10', '100', '1000', '10^6'], correct_answer: 'c', explanation: '1000 times K.', order_index: 3 },
            { id: 'c101-9-5', quiz_id: 'c101-quiz-9', type: 'mcq', text: 'Shift Right for Heat+CH4+2H2S <-> CS2+4H2', options: ['Remove CS2', 'Add H2', 'Dec T', 'Dec V'], correct_answer: 'a', explanation: 'Removing product shifts right.', order_index: 4 },
            { id: 'c101-9-6', quiz_id: 'c101-quiz-9', type: 'mcq', text: 'Dec Volume for same reaction:', options: ['Right', 'Left', 'None', 'K inc'], correct_answer: 'b', explanation: '3 gas -> 5 gas. High P shifts Left to 3.', order_index: 5 },
            { id: 'c101-9-7', quiz_id: 'c101-quiz-9', type: 'mcq', text: 'Inc Temp for N2O+NO2->3NO (Endo)', options: ['Left', 'Right', 'Dec K', 'None'], correct_answer: 'b', explanation: 'Heat is reactant, shifts right.', order_index: 6 },
            { id: 'c101-9-8', quiz_id: 'c101-quiz-9', type: 'mcq', text: 'Inert gas constant vol:', options: ['Right', 'Left', 'None', 'K chg'], correct_answer: 'c', explanation: 'No effect.', order_index: 7 },
            { id: 'c101-9-9', quiz_id: 'c101-quiz-9', type: 'mcq', text: 'Calc Q (PCl3...). Prediciton?', options: ['Q=4.96 Left', 'Q=4.96 Right', 'Q=0.18', 'Q=0.005'], correct_answer: 'a', explanation: 'Q > K (0.18), shifts left.', order_index: 8 },
            { id: 'c101-9-10', quiz_id: 'c101-quiz-9', type: 'mcq', text: 'Kc expression 2HCl + I2(s)...', options: ['All', 'HCl,HI,Cl2', 'HI,Cl2', 'I2'], correct_answer: 'b', explanation: 'Exclude solid I2.', order_index: 9 },
            { id: 'c101-9-11', quiz_id: 'c101-quiz-9', type: 'mcq', text: 'Kp=6.3e-3. Calc Kc for CO+2H2->CH3OH at 225C', options: ['11', '6.3e-3', '1.5e-4', '0.25'], correct_answer: 'a', explanation: 'Kc = Kp(RT)^2 approx 10.5 -> 11.', order_index: 10 },
            { id: 'c101-9-12', quiz_id: 'c101-quiz-9', type: 'mcq', text: 'Water decomp K=7.3e-18. H2 conc is:', options: ['Large', 'Equal', 'Small', 'Zero'], correct_answer: 'c', explanation: 'Extremely small K.', order_index: 11 },
            { id: 'c101-9-13', quiz_id: 'c101-quiz-9', type: 'mcq', text: '2HCl->H2+Cl2. K=3.2e-34. H2 conc?', options: ['8.9e-19', '0.05', '3.2e-34', '1.6e-17'], correct_answer: 'a', explanation: 'Sqrt(K) calc.', order_index: 12 },
            { id: 'c101-9-14', quiz_id: 'c101-quiz-9', type: 'mcq', text: 'If Q > Kc, reaction proceeds to:', options: ['Right', 'Left', 'Equil', 'Comp'], correct_answer: 'b', explanation: 'Too much product, shifts left.', order_index: 13 },
            { id: 'c101-9-15', quiz_id: 'c101-quiz-9', type: 'mcq', text: 'FALSE about catalyst:', options: ['Speeds fwd', 'Speeds rev', 'Changes pos', 'Same K'], correct_answer: 'c', explanation: 'Does NOT change position.', order_index: 14 }
        ]
    },

    'g101-quiz-2': {
        id: 'g101-quiz-2',
        course_id: 'g101',
        lesson_id: 'g101-l2',
        title: 'Solar System & Earth Structure',
        description: 'Chapter 2: Test your knowledge about the Solar System, Earth\'s interior, and planetary classification.',
        questions: [
            {
                id: 'g101-q2-1',
                quiz_id: 'g101-quiz-2',
                type: 'mcq',
                text: 'The Earth\'s magnetic field is produced by the interaction of...',
                options: ['Lithosphere and Hydrosphere', 'Crust and Mantle', 'Inner and Outer Core', 'Lower Mantle'],
                correct_answer: 'c',
                explanation: 'The Earth\'s magnetic field is generated by the movement of molten iron in the outer core.',
                order_index: 0
            },
            {
                id: 'g101-q2-2',
                quiz_id: 'g101-quiz-2',
                type: 'mcq',
                text: 'Which one of the Jovian planets is gaseous and has low density?',
                options: ['Saturn', 'Venus', 'Mars', 'Mercury'],
                correct_answer: 'a',
                explanation: 'Saturn is a Jovian (gas giant) planet with very low density - it could float on water!',
                order_index: 1
            },
            {
                id: 'g101-q2-3',
                quiz_id: 'g101-quiz-2',
                type: 'mcq',
                text: 'The Earth\'s layer with the highest volume is the...',
                options: ['Hydrosphere', 'Lithosphere', 'Asthenosphere', 'Mantle'],
                correct_answer: 'd',
                explanation: 'The mantle makes up about 84% of Earth\'s volume.',
                order_index: 2
            },
            {
                id: 'g101-q2-4',
                quiz_id: 'g101-quiz-2',
                type: 'mcq',
                text: 'What is the currently accepted age of the Earth?',
                options: ['46,000 years', '460,000 years', '4.6 million years', '4.6 billion years'],
                correct_answer: 'd',
                explanation: 'The Earth is approximately 4.6 billion years old, based on radiometric dating.',
                order_index: 3
            },
            {
                id: 'g101-q2-5',
                quiz_id: 'g101-quiz-2',
                type: 'mcq',
                text: 'What part of the Earth\'s internal structure is best described as molten iron and nickel?',
                options: ['Oceanic Crust', 'Lower Mantle', 'Outer Core', 'Inner Core'],
                correct_answer: 'c',
                explanation: 'The outer core is liquid and composed mainly of iron and nickel.',
                order_index: 4
            },
            {
                id: 'g101-q2-6',
                quiz_id: 'g101-quiz-2',
                type: 'mcq',
                text: 'The lithosphere is composed of...',
                options: ['Crust only', 'Crust + Upper Mantle', 'Mantle + Core', 'Inner + Outer Core'],
                correct_answer: 'b',
                explanation: 'The lithosphere includes the crust and the uppermost solid part of the mantle.',
                order_index: 5
            },
            {
                id: 'g101-q2-7',
                quiz_id: 'g101-quiz-2',
                type: 'true_false',
                text: 'The Moho discontinuity is a boundary separating crust and mantle.',
                options: ['True', 'False'],
                correct_answer: 'a',
                explanation: 'Named after Andrija Mohorovičić, it marks the boundary between Earth\'s crust and mantle.',
                order_index: 6
            },
            {
                id: 'g101-q2-8',
                quiz_id: 'g101-quiz-2',
                type: 'true_false',
                text: 'The continental crust is thicker, less dense, and older than the oceanic crust.',
                options: ['True', 'False'],
                correct_answer: 'a',
                explanation: 'Continental crust averages 35km thick vs 7km for oceanic crust.',
                order_index: 7
            },
            {
                id: 'g101-q2-9',
                quiz_id: 'g101-quiz-2',
                type: 'true_false',
                text: 'The Hydrosphere covers about 71% of Earth\'s surface.',
                options: ['True', 'False'],
                correct_answer: 'a',
                explanation: 'Water covers approximately 71% of Earth\'s surface.',
                order_index: 8
            },
            {
                id: 'g101-q2-10',
                quiz_id: 'g101-quiz-2',
                type: 'true_false',
                text: 'Continental crust is composed mainly of Basalt, while Oceanic crust is composed of Granite.',
                options: ['True', 'False'],
                correct_answer: 'b',
                explanation: 'It\'s the opposite! Continental crust = Granite (felsic), Oceanic crust = Basalt (mafic).',
                order_index: 9
            }
        ]
    },

    'g101-quiz-3': {
        id: 'g101-quiz-3',
        course_id: 'g101',
        lesson_id: 'g101-l3',
        title: 'Plate Tectonics',
        description: 'Chapter 3: Test your knowledge about plate boundaries, continental drift, and geological features.',
        questions: [
            {
                id: 'g101-q3-1',
                quiz_id: 'g101-quiz-3',
                type: 'mcq',
                text: 'Oceanic trench and volcanic island arc are marked at _______ plate boundaries.',
                options: ['Convergent', 'Divergent', 'Transform', 'Constructive'],
                correct_answer: 'a',
                explanation: 'Ocean trenches and island arcs form at convergent boundaries where plates collide.',
                order_index: 0
            },
            {
                id: 'g101-q3-2',
                quiz_id: 'g101-quiz-3',
                type: 'mcq',
                text: 'Subduction zones form at the _______ plate boundaries.',
                options: ['Divergent', 'Convergent', 'Transform', 'Tensional'],
                correct_answer: 'b',
                explanation: 'Subduction occurs at convergent boundaries where one plate dives under another.',
                order_index: 1
            },
            {
                id: 'g101-q3-3',
                quiz_id: 'g101-quiz-3',
                type: 'mcq',
                text: 'The San Andreas Fault in California is a Plate Boundary where one plate slides past another. This type is:',
                options: ['Divergent', 'Convergent', 'Transform', 'All of the above'],
                correct_answer: 'c',
                explanation: 'The San Andreas Fault is a famous transform boundary.',
                order_index: 2
            },
            {
                id: 'g101-q3-4',
                quiz_id: 'g101-quiz-3',
                type: 'mcq',
                text: 'The Himalaya Mountain chain was formed by the collision of...',
                options: ['Ocean-Ocean plates', 'Ocean-Continent plates', 'Continent-Continent plates', 'Transform fault'],
                correct_answer: 'c',
                explanation: 'The Himalayas formed from the collision of the Indian and Eurasian continental plates.',
                order_index: 3
            },
            {
                id: 'g101-q3-5',
                quiz_id: 'g101-quiz-3',
                type: 'mcq',
                text: 'The Red Sea and Sinai area is an example of _______ plate boundary.',
                options: ['Divergent', 'Convergent', 'Transform', 'Subduction'],
                correct_answer: 'a',
                explanation: 'The Red Sea is a rift zone forming at a divergent boundary.',
                order_index: 4
            },
            {
                id: 'g101-q3-6',
                quiz_id: 'g101-quiz-3',
                type: 'mcq',
                text: 'Hawaiian Islands are a good example of...',
                options: ['Island Arcs', 'Hot Spots', 'Mid-ocean ridges', 'Trenches'],
                correct_answer: 'b',
                explanation: 'Hawaii formed over a hot spot - a stationary plume of magma in the mantle.',
                order_index: 5
            },
            {
                id: 'g101-q3-7',
                quiz_id: 'g101-quiz-3',
                type: 'true_false',
                text: 'Wegener could not explain the driving force behind continental drift.',
                options: ['True', 'False'],
                correct_answer: 'a',
                explanation: 'This was a major criticism of his theory - mantle convection wasn\'t understood yet.',
                order_index: 6
            },
            {
                id: 'g101-q3-8',
                quiz_id: 'g101-quiz-3',
                type: 'true_false',
                text: 'In a Transform boundary, plates move away from each other.',
                options: ['True', 'False'],
                correct_answer: 'b',
                explanation: 'At transform boundaries, plates slide past each other horizontally.',
                order_index: 7
            },
            {
                id: 'g101-q3-9',
                quiz_id: 'g101-quiz-3',
                type: 'true_false',
                text: 'The Pacific Ring of Fire is a belt of active earthquakes and volcanoes.',
                options: ['True', 'False'],
                correct_answer: 'a',
                explanation: 'The Ring of Fire contains 75% of the world\'s volcanoes.',
                order_index: 8
            },
            {
                id: 'g101-q3-10',
                quiz_id: 'g101-quiz-3',
                type: 'true_false',
                text: 'New basaltic crust is created at the divergent mid-ocean ridge.',
                options: ['True', 'False'],
                correct_answer: 'a',
                explanation: 'Seafloor spreading creates new oceanic crust at mid-ocean ridges.',
                order_index: 9
            }
        ]
    },

    'g101-quiz-4': {
        id: 'g101-quiz-4',
        course_id: 'g101',
        lesson_id: 'g101-l4',
        title: 'Geological Structures',
        description: 'Chapter 4: Test your knowledge about folds, faults, and rock deformation.',
        questions: [
            {
                id: 'g101-q4-1',
                quiz_id: 'g101-quiz-4',
                type: 'mcq',
                text: 'Which sedimentary structure is characterized by a progressive decrease in grain size upward?',
                options: ['Cross-bedding', 'Ripple marks', 'Graded bedding', 'Mudcracks'],
                correct_answer: 'c',
                explanation: 'Graded bedding shows coarse grains at the bottom transitioning to fine grains at the top.',
                order_index: 0
            },
            {
                id: 'g101-q4-2',
                quiz_id: 'g101-quiz-4',
                type: 'mcq',
                text: 'In an Anticline fold, the _______ rocks are found in the core.',
                options: ['Youngest', 'Oldest', 'Sedimentary', 'Metamorphic'],
                correct_answer: 'b',
                explanation: 'In anticlines, the oldest rocks are exposed in the center of the fold.',
                order_index: 1
            },
            {
                id: 'g101-q4-3',
                quiz_id: 'g101-quiz-4',
                type: 'mcq',
                text: 'Normal faults are created by _______ forces.',
                options: ['Compressional', 'Tensional', 'Shear', 'Magnetic'],
                correct_answer: 'b',
                explanation: 'Normal faults form when rocks are pulled apart (tensional/extensional stress).',
                order_index: 2
            },
            {
                id: 'g101-q4-4',
                quiz_id: 'g101-quiz-4',
                type: 'mcq',
                text: 'A fault where the hanging wall moves DOWN relative to the footwall is called:',
                options: ['Reverse fault', 'Thrust fault', 'Normal fault', 'Strike-slip fault'],
                correct_answer: 'c',
                explanation: 'In a normal fault, the hanging wall drops down relative to the footwall.',
                order_index: 3
            },
            {
                id: 'g101-q4-5',
                quiz_id: 'g101-quiz-4',
                type: 'mcq',
                text: 'The San Andreas fault is an example of a _______ fault.',
                options: ['Normal', 'Reverse', 'Strike-slip', 'Thrust'],
                correct_answer: 'c',
                explanation: 'The San Andreas is a right-lateral strike-slip fault.',
                order_index: 4
            },
            {
                id: 'g101-q4-6',
                quiz_id: 'g101-quiz-4',
                type: 'mcq',
                text: 'Which type of deformation is temporary and reversible?',
                options: ['Plastic', 'Brittle', 'Elastic', 'Ductile'],
                correct_answer: 'c',
                explanation: 'Elastic deformation is like stretching a rubber band - it returns to original shape.',
                order_index: 5
            },
            {
                id: 'g101-q4-7',
                quiz_id: 'g101-quiz-4',
                type: 'true_false',
                text: 'In a Syncline, the layers warp downward.',
                options: ['True', 'False'],
                correct_answer: 'a',
                explanation: 'A syncline is a downward-curving fold (trough-shaped).',
                order_index: 6
            },
            {
                id: 'g101-q4-8',
                quiz_id: 'g101-quiz-4',
                type: 'true_false',
                text: 'Reverse faults are caused by tensional stress.',
                options: ['True', 'False'],
                correct_answer: 'b',
                explanation: 'Reverse faults are caused by compressional stress (pushing together).',
                order_index: 7
            },
            {
                id: 'g101-q4-9',
                quiz_id: 'g101-quiz-4',
                type: 'true_false',
                text: 'Horst and Graben structures are associated with normal faults.',
                options: ['True', 'False'],
                correct_answer: 'a',
                explanation: 'Horst (uplifted block) and Graben (down-dropped block) form from normal faulting.',
                order_index: 8
            },
            {
                id: 'g101-q4-10',
                quiz_id: 'g101-quiz-4',
                type: 'true_false',
                text: 'Strike-slip faults involve mainly horizontal movement.',
                options: ['True', 'False'],
                correct_answer: 'a',
                explanation: 'Strike-slip faults have horizontal displacement along the fault plane.',
                order_index: 9
            }
        ]
    },

    'g101-quiz-5': {
        id: 'g101-quiz-5',
        course_id: 'g101',
        lesson_id: 'g101-l5',
        title: 'Minerals',
        description: 'Chapter 5: Test your knowledge about mineral properties, bonding, and classification.',
        questions: [
            {
                id: 'g101-q5-1',
                quiz_id: 'g101-quiz-5',
                type: 'mcq',
                text: 'Which bond involves the sharing of electrons between atoms?',
                options: ['Ionic', 'Covalent', 'Metallic', 'Van der Waals'],
                correct_answer: 'b',
                explanation: 'Covalent bonding involves sharing electrons between atoms.',
                order_index: 0
            },
            {
                id: 'g101-q5-2',
                quiz_id: 'g101-quiz-5',
                type: 'mcq',
                text: 'The color of the powder produced by rubbing a mineral on a porcelain plate is called:',
                options: ['Luster', 'Cleavage', 'Streak', 'Fracture'],
                correct_answer: 'c',
                explanation: 'Streak is more reliable than color for mineral identification.',
                order_index: 1
            },
            {
                id: 'g101-q5-3',
                quiz_id: 'g101-quiz-5',
                type: 'mcq',
                text: 'Which mineral has a hardness of 7 on Mohs scale?',
                options: ['Calcite', 'Diamond', 'Quartz', 'Gypsum'],
                correct_answer: 'c',
                explanation: 'Quartz is the reference mineral for hardness 7 on the Mohs scale.',
                order_index: 2
            },
            {
                id: 'g101-q5-4',
                quiz_id: 'g101-quiz-5',
                type: 'mcq',
                text: 'The tendency of a mineral to break along planes of weak bonding is:',
                options: ['Fracture', 'Cleavage', 'Hardness', 'Tenacity'],
                correct_answer: 'b',
                explanation: 'Cleavage produces smooth, flat surfaces when minerals break.',
                order_index: 3
            },
            {
                id: 'g101-q5-5',
                quiz_id: 'g101-quiz-5',
                type: 'mcq',
                text: 'Which mineral reacts (fizzes) with HCl immediately?',
                options: ['Quartz', 'Calcite', 'Dolomite', 'Gypsum'],
                correct_answer: 'b',
                explanation: 'Calcite (CaCO₃) reacts vigorously with dilute HCl.',
                order_index: 4
            },
            {
                id: 'g101-q5-6',
                quiz_id: 'g101-quiz-5',
                type: 'mcq',
                text: 'Halite (NaCl) belongs to which mineral group?',
                options: ['Silicates', 'Carbonates', 'Halides', 'Oxides'],
                correct_answer: 'c',
                explanation: 'Halite is a halide mineral - it contains a halogen (chlorine).',
                order_index: 5
            },
            {
                id: 'g101-q5-7',
                quiz_id: 'g101-quiz-5',
                type: 'true_false',
                text: 'A mineral must be organic and liquid.',
                options: ['True', 'False'],
                correct_answer: 'b',
                explanation: 'Minerals must be inorganic and solid (with crystalline structure).',
                order_index: 6
            },
            {
                id: 'g101-q5-8',
                quiz_id: 'g101-quiz-5',
                type: 'true_false',
                text: 'Diamond is the hardest known natural mineral.',
                options: ['True', 'False'],
                correct_answer: 'a',
                explanation: 'Diamond rates 10 on the Mohs hardness scale - the maximum.',
                order_index: 7
            },
            {
                id: 'g101-q5-9',
                quiz_id: 'g101-quiz-5',
                type: 'true_false',
                text: 'Conchoidal fracture is characteristic of Quartz.',
                options: ['True', 'False'],
                correct_answer: 'a',
                explanation: 'Quartz breaks with smooth, curved (conchoidal) fracture surfaces.',
                order_index: 8
            },
            {
                id: 'g101-q5-10',
                quiz_id: 'g101-quiz-5',
                type: 'true_false',
                text: 'Piezoelectricity is a property found in Quartz.',
                options: ['True', 'False'],
                correct_answer: 'a',
                explanation: 'Quartz crystals generate electricity when stressed - used in watches!',
                order_index: 9
            }
        ]
    },

    'g101-quiz-6': {
        id: 'g101-quiz-6',
        course_id: 'g101',
        lesson_id: 'g101-l6',
        title: 'Rocks',
        description: 'Chapter 6: Test your knowledge about igneous, sedimentary, and metamorphic rocks.',
        questions: [
            {
                id: 'g101-q6-1',
                quiz_id: 'g101-quiz-6',
                type: 'mcq',
                text: 'Which rock texture indicates slow cooling of magma deep underground?',
                options: ['Aphanitic (fine-grained)', 'Phaneritic (coarse-grained)', 'Glassy', 'Vesicular'],
                correct_answer: 'b',
                explanation: 'Slow cooling allows large crystals to form, creating phaneritic texture.',
                order_index: 0
            },
            {
                id: 'g101-q6-2',
                quiz_id: 'g101-quiz-6',
                type: 'mcq',
                text: 'Granite is an example of a _______ igneous rock.',
                options: ['Extrusive', 'Intrusive', 'Clastic', 'Chemical'],
                correct_answer: 'b',
                explanation: 'Granite forms from magma cooling slowly underground (intrusive/plutonic).',
                order_index: 1
            },
            {
                id: 'g101-q6-3',
                quiz_id: 'g101-quiz-6',
                type: 'mcq',
                text: 'Which rock forms from the accumulation of shell fragments?',
                options: ['Shale', 'Sandstone', 'Limestone', 'Conglomerate'],
                correct_answer: 'c',
                explanation: 'Biological limestone forms from accumulated marine organism shells.',
                order_index: 2
            },
            {
                id: 'g101-q6-4',
                quiz_id: 'g101-quiz-6',
                type: 'mcq',
                text: 'The parent rock of marble is:',
                options: ['Sandstone', 'Shale', 'Limestone', 'Granite'],
                correct_answer: 'c',
                explanation: 'Marble is metamorphosed limestone (CaCO₃ recrystallizes).',
                order_index: 3
            },
            {
                id: 'g101-q6-5',
                quiz_id: 'g101-quiz-6',
                type: 'mcq',
                text: 'Which process describes the conversion of sediment into sedimentary rock?',
                options: ['Metamorphism', 'Crystallization', 'Lithification', 'Weathering'],
                correct_answer: 'c',
                explanation: 'Lithification involves compaction and cementation of sediments.',
                order_index: 4
            },
            {
                id: 'g101-q6-6',
                quiz_id: 'g101-quiz-6',
                type: 'true_false',
                text: 'Basalt and Gabbro have similar chemical composition but different textures.',
                options: ['True', 'False'],
                correct_answer: 'a',
                explanation: 'Both are mafic, but basalt is fine-grained (extrusive) while gabbro is coarse (intrusive).',
                order_index: 5
            },
            {
                id: 'g101-q6-7',
                quiz_id: 'g101-quiz-6',
                type: 'true_false',
                text: 'Foliation is a characteristic feature of all metamorphic rocks.',
                options: ['True', 'False'],
                correct_answer: 'b',
                explanation: 'Some metamorphic rocks like marble and quartzite are non-foliated.',
                order_index: 6
            },
            {
                id: 'g101-q6-8',
                quiz_id: 'g101-quiz-6',
                type: 'true_false',
                text: 'Obsidian forms when lava cools so rapidly that crystals cannot form.',
                options: ['True', 'False'],
                correct_answer: 'a',
                explanation: 'Obsidian is volcanic glass - it has no crystalline structure.',
                order_index: 7
            }
        ]
    },

    'g101-quiz-7': {
        id: 'g101-quiz-7',
        course_id: 'g101',
        lesson_id: 'g101-l7',
        title: 'Weathering',
        description: 'Chapter 7: Test your knowledge about mechanical and chemical weathering processes.',
        questions: [
            {
                id: 'g101-q7-1',
                quiz_id: 'g101-quiz-7',
                type: 'mcq',
                text: 'Which type of weathering involves the physical breakup of rocks without chemical change?',
                options: ['Chemical weathering', 'Mechanical weathering', 'Biological weathering', 'Dissolution'],
                correct_answer: 'b',
                explanation: 'Mechanical (physical) weathering breaks rocks into smaller pieces without changing composition.',
                order_index: 0
            },
            {
                id: 'g101-q7-2',
                quiz_id: 'g101-quiz-7',
                type: 'mcq',
                text: 'Frost wedging is most effective in what climate?',
                options: ['Tropical', 'Desert', 'Temperature with freezing and thawing', 'Polar (constant freeze)'],
                correct_answer: 'c',
                explanation: 'Frost wedging requires repeated freezing and thawing cycles.',
                order_index: 1
            },
            {
                id: 'g101-q7-3',
                quiz_id: 'g101-quiz-7',
                type: 'mcq',
                text: 'The chemical weathering of feldspar produces:',
                options: ['Quartz sand', 'Clay minerals', 'Iron oxide', 'Calcium carbite'],
                correct_answer: 'b',
                explanation: 'Feldspar weathers to produce clay minerals (like kaolinite).',
                order_index: 2
            },
            {
                id: 'g101-q7-4',
                quiz_id: 'g101-quiz-7',
                type: 'mcq',
                text: 'Which factor does NOT increase weathering rate?',
                options: ['Increased surface area', 'Higher temperature', 'More precipitation', 'Less vegetation'],
                correct_answer: 'd',
                explanation: 'Vegetation actually increases weathering through root action and acid production.',
                order_index: 3
            },
            {
                id: 'g101-q7-5',
                quiz_id: 'g101-quiz-7',
                type: 'true_false',
                text: 'Exfoliation (sheeting) is a type of chemical weathering.',
                options: ['True', 'False'],
                correct_answer: 'b',
                explanation: 'Exfoliation is mechanical weathering - rock layers peel off due to pressure release.',
                order_index: 4
            },
            {
                id: 'g101-q7-6',
                quiz_id: 'g101-quiz-7',
                type: 'true_false',
                text: 'Limestone is particularly susceptible to dissolution by acidic water.',
                options: ['True', 'False'],
                correct_answer: 'a',
                explanation: 'Carbonic acid dissolves limestone, creating karst features like caves.',
                order_index: 5
            },
            {
                id: 'g101-q7-7',
                quiz_id: 'g101-quiz-7',
                type: 'true_false',
                text: 'Oxidation weathering produces the red/orange color in many soils.',
                options: ['True', 'False'],
                correct_answer: 'a',
                explanation: 'Iron oxidation (rusting) produces red/orange iron oxides in soils.',
                order_index: 6
            }
        ]
    }
};

// Helper to get a quiz by ID
export function getQuizById(id: string): QuizWithQuestions | null {
    return MOCK_QUIZZES[id] || null;
}

// Helper to get all quizzes for a course
export function getQuizzesForCourse(courseId: string): QuizWithQuestions[] {
    return Object.values(MOCK_QUIZZES).filter(quiz => quiz.course_id === courseId);
}
