# Heliograph

Heliograph is a research instrument for a production question: when a model goes stale, do you hold the weights, inspect the sensors, or retrain?

**Nancy Verma** · registration `23FE10CAI00241` · branch AIML  
**AIM4142 MLOps** · Department of AI & ML · Manipal University Jaipur

- Live app: https://mlops-project-kohl.vercel.app
- Source: https://github.com/Nancy20052020/Mlops_project
- PDF report: [`public/Nancy-Verma-AIM4142-Heliograph-Report.pdf`](public/Nancy-Verma-AIM4142-Heliograph-Report.pdf)

It is the project for **AIM4142 MLOps**, Department of AI & ML, School of Computer Science and Engineering, Manipal University Jaipur. The topic is model monitoring: covariate shift, concept drift, label delay, and a pre-registered retraining rule.

A frozen logistic model watches a simulated coastal wind farm. Six seeded weathers arrive. Population stability index, expected calibration error, and a Page-Hinkley test on the residuals each get a vote. The same TypeScript modules feed the observatory, the protocol table, the written report, and the test suite, so the page and the paper cannot disagree.

## Run it

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Path | What it is |
| --- | --- |
| `/` | The ridge, and the three ways a model fails |
| `/observatory` | Replay a weather. Space plays, arrows step. A refit shows what new labels would buy |
| `/desk` | Cast your own front: humidity, wind, boundary, label lag |
| `/protocol` | The six-system scoreboard |
| `/report` | Problem, method, results, conclusion, with the Vercel and GitHub links |
| `/report/download` | The same report as Markdown |
| `/Nancy-Verma-AIM4142-Heliograph-Report.pdf` | The submission PDF |

`npm run bench` prints the seed-11 scores. `npm run report` rewrites `REPORT.md` from the live numbers.

## Deploy on Vercel

The app is a standard Next.js project. It has no environment variables, no database, and no Python runtime.

1. Push this repository to GitHub.
2. In Vercel, choose **Add New Project** and import the repository.
3. Framework preset: **Next.js**. Leave the build command as `next build` and the output as the default.
4. Do not add environment variables.
5. Deploy. The first build installs dependencies, downloads the fonts, and statically renders the report from the simulator.

A local check before you deploy:

```bash
npm run build
npm start
```

## What the rule does

- **Inspect** when the worst feature PSI crosses 0.25 and calibration holds. Wet bulb (a humidity probe) and Veering wind are this case.
- **Retrain** when expected calibration error rises by 0.07. Boundary break, Squall line, and Late letters are this case.
- **Hold** when both stay quiet. Clear air is this case.

On seed 11 all six diagnoses match the ground truth. Across seeds 1–24 the match is 143 of 144. The one miss is recorded in the report.

## Submission

1. Deploy on Vercel and keep the URL.
2. Open `/report` and print to PDF. That file is the project report: problem statement, objectives, methodology, implementation, results, and conclusion.
3. Screenshot the observatory on Wet bulb, Boundary break, and Late letters, plus the protocol table.
4. Submit the report, the repository link, the Vercel link, and the screenshots.

## Layout

```
lib/drift     PSI, KS, Jensen-Shannon, ECE, Page-Hinkley, KDE
lib/sim       seeded turbine world, frozen logistic model, policy
lib/experiments   seed-11 bench and the 24-seed sweep
app             landing, observatory, protocol, report
tests           detector checks and the six-weather contract
```
