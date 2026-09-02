# Figma Wireframe Review — Institution, Student, Verifier Flows

Review pass over the three portal flows ahead of building the base component set (Week 2) and
each dashboard shell (Weeks 3–6). Goal: confirm the screen inventory per flow and flag anything
that needs a design decision before component work starts.

## Institution flow

Screens needed: sign-in, certificate registry (list view), issuance form, certificate detail
view, activity/analytics view, settings. The issuance form is the highest-stakes screen in this
flow — every field on it maps directly to what gets hashed and anchored on-chain, so its layout
needs to make the holder's identity fields (name, email, enrollment number) impossible to miss or
mis-order. Flagging this explicitly for the base component set: form field components need a
"required" visual treatment strong enough that a mandatory field is never mistaken for optional.

## Student flow

Screens needed: sign-in, credential gallery (list of issued certificates), a share panel per
credential (verification link + QR code). Deliberately the smallest flow of the three — a student
never issues or revokes anything, only views and shares what's already been issued to them.

## Verifier flow

Screens needed: an entry screen (enter a certificate ID or scan a QR code) and a result screen.
The result screen is the one place in the whole product where all four verification outcomes
(verified / revoked / tampered / not-found) need distinct, unambiguous visual treatment — a
verifier who can't immediately tell a REVOKED result from a VERIFIED one at a glance defeats the
entire point of the system. Flagging this for the result-screen build: outcome must never be
communicated by color alone (accessibility), and the wording for each of the four outcomes needs
to be reviewed by the whole team before it's finalized, since it's user-facing trust language.

## Cross-flow notes

- No flow requires a document upload anywhere — verification is always identifier-based (enter
  the ID, or scan the QR code that encodes it). Worth confirming this stays true as the other
  flows get built out, since a later "upload a document to verify" feature would be a different
  verification model entirely.
- All three flows need to work down to a 320px-wide viewport — noted for the responsive pass in
  later weeks, not something to solve in this week's scaffold.

## Open questions for the team

- Exact brand colors/typography aren't finalized yet — the scaffold in `apps/web/src/index.css`
  uses placeholder token values pending that decision, not final ones.
