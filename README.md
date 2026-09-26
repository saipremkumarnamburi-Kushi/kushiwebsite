# Kushal Chowdary — D365 Tech Solutions

The public course landing page includes the owner's transparent portrait background, a photo-free instructor biography, and free YouTube lesson links. Student accounts and Razorpay checkout have been added; they stay unavailable until real provider configuration and course details are supplied.

## Project

- `out/index.html`, `out/styles.css`, `out/app.js`: existing landing page.
- `out/account.js`, `out/account.css`: Google/mobile sign-in, checkout and purchase history.
- `server/worker.mjs`: authenticated API, Firestore persistence, Razorpay order/signature/webhook verification.
- `config/firestore.rules`: deny direct client access to payment data.
- `SETUP.md`: provider activation and required runtime settings.

`npm test` runs automated security checks. `npm run build` prepares the Cloudflare-compatible worker. `npm start` previews static files only; it does not emulate the backend.

The site is public. Deployment changes preserve its existing audience. The merchant account, Google project, course price, terms/refund policy, support contact and delivery instructions must be supplied by the owner before accepting real enrolments. Automated tests do not send SMS or charge payments. No recorded course video hosting is included.
