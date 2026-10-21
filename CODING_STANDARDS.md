# Coding standards

Judgement rules no linter holds. Each one comes from a bug that passed every test. A review cites them by number.

1. **A fake lags like the service it stands for.** A fake of GitHub or Jira models that service's documented consistency, and both listings lag behind writes. Every read after a write gets a test with a lagging listing (`freezeListing`, `freezeSearch` in `packages/stations/src/fakes.ts`). Live, a closed run still listed as open kept the factory busy with no one to wake it.
2. **A limit the validator enforces is stated where the model reads its rules.** Each limit gets a test that ties the prompt and the validator, like `tells the model every limit validateSpec enforces on a list` in `spec.test.ts`. Live, two specs failed on a limit the model was never told.
3. **An integration check counts only with input from the real producer:** a real Jira event, a real dispatch, a real token. A body we built and signed ourselves proves our own code, not the integration. The relay passed that way while Jira's webhook pointed at Jira's own page.
4. **A new guard ships with its test shown red.** Remove the guard, run the test, see it fail, put the guard back. A test that stays green without its guard guards nothing.
