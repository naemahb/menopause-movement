# Menopause Movement

A personalized fitness planning tool for women in perimenopause and postmenopause — built by someone who needed it.

---

## The problem

Generic fitness advice doesn't work for menopausal women. "Work out more, eat less" ignores the reality of chronically elevated cortisol, autoimmune conditions, joint inflammation, thyroid dysfunction, and the hormonal shifts that change how the body responds to exercise entirely. Most fitness apps weren't designed with this profile in mind.

The result: women push harder, see worse results, injure themselves, and blame their own effort.

---

## What this does

Menopause Movement takes a personalized onboarding quiz and generates a tailored movement plan based on your actual health picture — not a generalized template.

The quiz collects:
- **Menopause stage** (perimenopause, postmenopause, surgical/induced)
- **Sleep quality and duration** — a primary cortisol driver
- **Stress levels** — elevated cortisol changes how your body responds to exercise
- **Current activity type and intensity**
- **Energy patterns** throughout the day
- **Medical conditions** from a curated list of the most common comorbidities in menopausal women: hypothyroidism, high blood pressure, type 2 diabetes/insulin resistance, cardiovascular disease, osteopenia/osteoporosis, arthritis, autoimmune disease, depression/anxiety, fibromyalgia/chronic pain, vertigo, CKD, and more

### The Cortisol Risk Score

The quiz feeds into a scoring engine that calculates your **Cortisol Risk Score** — a composite of sleep, stress, intensity, and medical screener inputs. This score determines the intensity ceiling and recovery requirements of your plan. High-cortisol women need a fundamentally different approach to exercise than low-cortisol women, even if their fitness goals are identical.

### Medical Condition Plan Modifiers

Each medical condition maps to specific plan modifications — not generic disclaimers. A woman with osteoporosis gets bone-loading recommendations. A woman with arthritis gets joint-protective movement substitutions. A woman with autoimmune disease gets recovery-first scheduling. The plan adapts to the full picture, not just the primary goal.

### AI-generated personalization

The Claude API generates a specific, personalized movement plan for each user — not a generic template pulled by condition type. The output reads like advice from someone who understands your actual situation, not a fitness algorithm.

---

## Design philosophy

**Generic advice is noise. Personalized advice is signal.**

The gap between "do strength training" and "here's exactly what to do given your cortisol score, your knee arthritis, and your autoimmune load" is where most fitness tools fail menopausal women. This app was designed to live in that gap.

The quiz logic was built around research into the most common comorbidities in menopausal women — not assumptions. Every modifier, every scoring rule, every plan output was tested against real health profiles.

**Recovery is part of the program, not a break from it.**

The app is opinionated about this: for many menopausal women, the right answer is *less* intensity, not more. The Cortisol Risk Score exists specifically to surface this when the data supports it, even when it contradicts what the user thinks they need to do.

---

## Tech stack

- **TypeScript** — full-stack
- **CSS / JavaScript**
- **Claude API (Anthropic)** — personalized plan generation
- Built with **Claude + Cursor** (vibe-coded)

---

## Status

Actively in development. The quiz logic and system prompt are built and iterated. UI is in progress. Next: building the interactive quiz UI and plan output interface.

---

## Why I built this

Generic fitness advice consistently fails women going through hormonal transitions. The "work harder" approach backfires when cortisol is already elevated, joints are inflamed, and the body's recovery needs have fundamentally changed. I built the tool I couldn't find — one that starts from your actual physiology instead of a generic template.
