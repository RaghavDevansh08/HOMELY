# HOMELY

Trusted household help, booked nearby. Customers compare estimates, professionals run their visits, and an administrator reviews documents.

## What works in the preview

- Email and password accounts, plus Google and X sign-in
- Customer booking from service choice through estimate, confirmation, messages, cancellation, reschedule, and review
- Demo professionals labelled as samples, with a button to step a simulated visit
- Professional requests, status updates, price revisions, availability, earnings, and document submission
- Administrator overview, people, suspensions, document review, complaints, review hiding, fees, and an audit log
- Rule-based ranking and a preliminary duration estimate
- In-app guide. Assistant answers only when you ask and the app has a server key

## What is not connected

- Live maps. City, PIN, and optional browser location are used instead. Distances are approximate.
- SMS, email delivery, and OTP. Password reset is not emailed. Change it while signed in.
- Card payments. Visits are pay-on-completion records. Card numbers are never stored.
- Aadhaar or face verification. Badges appear only after an administrator approves a consented document.
- The Python duration model, unless `DURATION_SERVICE_URL` is set. Otherwise the estimate is labelled preliminary.

## Roles

Create one account per desk. There is no admin checkbox on sign-up. If no administrator exists, the admin page offers a one-time claim. That replaces the account's role.

Demo profiles cannot sign in. They exist so the marketplace is not empty.

## Local development

The app is a TanStack Start project.

```bash
npm install
npm run dev
```

The dev server listens on port 8080. Postgres is used when `DATABASE_URL` is set. Without it, an embedded Postgres is used and the schema in `migrations/` is applied on startup.

Useful checks:

```bash
npm run typecheck
npm run build
npm test
```

## Environment

Do not commit secrets. On deploy, the platform injects database and auth settings.

| Variable               | Where  | Purpose                                                         |
| ---------------------- | ------ | --------------------------------------------------------------- |
| `DATABASE_URL`         | server | Postgres connection. Optional locally.                          |
| `XAI_API_KEY`          | server | Assistant answers from the guide. Never exposed to the browser. |
| `DURATION_SERVICE_URL` | server | Optional `ai/duration_service.py` endpoint.                     |

Start the optional model with Python 3. If scikit-learn is installed it fits a small synthetic model. If not, it says so.

```bash
python ai/duration_service.py
```

## Deploy

`npm run build` compiles the app and applies migrations. Publish through the hosting action for this project. A live maps key, an email provider, and a payment gateway are not part of this build.
