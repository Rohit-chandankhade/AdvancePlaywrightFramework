# Advance Playwright 3

Playwright Test automation framework for the [The Testing Academy](https://thetestingacademy.com) demo
sites (TTACart). Built with TypeScript, Winston logging, Faker data generation and a Page Object
model that keeps tests short and readable.

## Tech stack

| Concern            | Tool                                     |
| ------------------ | ---------------------------------------- |
| Test runner        | `@playwright/test`                       |
| Language           | TypeScript                               |
| Logging            | `winston`                                |
| Test data          | `@faker-js/faker`                        |
| Reporting          | Playwright HTML + list reporter          |
| CI                 | GitHub Actions                           |
| Data formats       | `xlsx`, `csv-parse`, `jsonpath-plus`     |
| Validation schemas | `ajv`, `ajv-formats`                     |
| Env loading        | `dotenv`                                 |

## Project structure

```
.
├── .github/workflows/playwright.yml   # CI: runs npx playwright test, uploads report
├── docs/                              # reserved for extra documentation
├── rules/                             # reserved for AI/agent rule files
├── src/
│   ├── api/                           # API test helpers
│   ├── config/                        # env + config readers
│   ├── fixtures/                      # custom Playwright fixtures
│   ├── pages/                         # Page Objects
│   │   ├── BasePage.ts                # shared base class
│   │   ├── LoginPage.ts               # TTACart login screen
│   │   ├── ItemDetailsPage.ts
│   │   ├── Checkout1Page.ts
│   │   └── inventoryPage.ts
│   ├── testdata/                      # test data files
│   └── utils/
│       ├── UtilElementLocators.ts     # reusable action wrapper
│       ├── logger.ts                  # Winston logger factory
│       ├── DataGenerator.ts           # Faker helpers
│       └── CustomReporters.ts         # custom TTA HTML reporter (disabled)
├── tests/
│   ├── login.spec.ts
│   └── example.spec.ts                # scaffold smoke test
├── playwright.config.ts
└── tsconfig.json
```

`src/api`, `src/config`, `src/fixtures` and `src/testdata` are wired up in `tsconfig.json` but are
still empty — the current suite only covers UI tests.

## Getting started

```bash
npm install
npx playwright install chromium
```

Then copy an env file and fill in what you need:

```bash
cp .env.example .env
```

### Environment variables

| Variable              | Used by                | Default                                             | Description                                  |
| --------------------- | ---------------------- | --------------------------------------------------- | -------------------------------------------- |
| `BASE_URL`            | `playwright.config.ts` | –                                                   | Base URL for `page.goto()` calls.            |
| `TTA_ENV`             | `playwright.config.ts` | `qa`                                                | Environment selector (see note below).       |
| `QA_BASE_URL`         | `playwright.config.ts` | `https://app.thetestingacademy.com`                  | QA target.                                   |
| `STG_BASE_URL`        | `playwright.config.ts` | `https://stage.thetestingacademy.com`                | Staging target.                              |
| `PROD_BASE_URL`       | `playwright.config.ts` | `https://app.thetestingacademy.com`                  | Production target.                           |
| `DEV_BASE_URL`        | `playwright.config.ts` | `http://localhost:3000`                              | Local dev target.                            |
| `API_BASE_URL`        | `playwright.config.ts` | `https://restful-booker.herokuapp.com`               | API target.                                  |
| `ATTACH_SCREENSHOTS`  | `playwright.config.ts` | `false`                                             | `true` enables `only-on-failure` screenshots. |
| `LOG_LEVEL`           | `src/utils/logger.ts`  | `info`                                              | Winston log level.                           |
| `TEST_ENV`            | reporter               | `UAT`                                               | Shown in the HTML report header.             |
| `TEST_AUTHOR`         | reporter               | `TTA-QA`                                            | Shown in the HTML report.                    |

> **Note on `TTA_ENV`:** the `resolveBaseURL()` helper in `playwright.config.ts` maps `TTA_ENV` to the
> matching `*_BASE_URL` variable, but it is currently **not called** — `use.baseURL` reads
> `process.env.BASE_URL` directly. So today you must set `BASE_URL` explicitly; `TTA_ENV` has no effect.

`.env` is git-ignored, so credentials stay local.

## Running tests

```bash
# run everything
npx playwright test

# run one file
npx playwright test tests/login.spec.ts

# run by tag (tags are inline, e.g. @p0, @smoke)
npx playwright test --grep @p0

# headed / debug
npx playwright test --headed --debug

# open the last HTML report
npx playwright show-report
```

### Browser projects

Only `chromium` is enabled (1920x1080 desktop). Firefox, WebKit and the mobile/branded-browser
projects are present in `playwright.config.ts` but commented out — uncomment the block you need.

## Writing a test

Tests live in `tests/`. They instantiate page objects and wrap meaningful groups of actions in
`test.step()` so the report reads like a checklist.

```ts
import { test } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';
import { createLogger } from '../src/utils/logger';

const log = createLogger('login.spec');

test.describe('TTACart - Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await test.step('Open the TTACart login page', async () => {
      await loginPage.open();
    });
  });

  test('logs in with valid credentials @p0', async () => {
    await test.step('Login as standard_user', async () => {
      await loginPage.loginAs('standard_user', 'tta_secret');
    });
  });
});
```

### Page Objects

Extend `BasePage`, pass a scope name, and declare your own `private readonly` locators. The base
class hands you three things:

- `page` — the Playwright `Page`
- `el` — a `UtilElementLocator` for logged, timeout-aware actions
- `log` — a Winston logger tagged with the page's scope

```ts
export class LoginPage extends BasePage {
  static readonly PATH = '/playwright/ttacart/index.html';

  private readonly usernameInput: Locator;

  constructor(page: Page) {
    super(page, 'LoginPage');
    this.usernameInput = page.locator('[data-test="username"]');
  }

  async open(): Promise<void> {
    await this.goto(LoginPage.PATH);
  }
}
```

### UtilElementLocator

Every method accepts a `Flex` — either a CSS string (`'[data-test="username"]'`) or an existing
`Locator` (`page.getByTestId('username')`) — and applies a default 15s timeout. Actions log to
Winston and wrap `locator.type()` as `pressSequentially()` to match current Playwright APIs.

Available groups: mouse (`click`, `doubleClick`, `rightClick`, `hover`), input (`fill`, `type`,
`clear`), getters (`getText`, `getInnerText`, `getAllTexts`, `getAttr`, `getValue`), state
(`isVisible`, `isEnabled`, `isChecked`), waits (`waitForVisible`, `waitForHidden`,
`waitForPageLoad`) and selects (`selectByText`, `selectByValue`, `selectByIndex`).

### Logging

`createLogger('ScopeName')` returns a Winston child logger. Output goes to a colourised console and
to `logs/combined.log` (git-ignored), so CI runs leave an artifact behind.

```
2026-09-29 19:17:09 [info] [LoginPage] loginAs standard_user
```

### Test data

`DataGenerator` wraps Faker for credentials, contact details, numbers, dates and one-of picks, so
tests don't import Faker directly.

## Reports

`playwright.config.ts` registers two reporters: `list` for the terminal and `html` for
`playwright-report/`. Video and tracing are always recorded; screenshots are opt-in via
`ATTACH_SCREENSHOTS=true`.

`src/utils/CustomReporters.ts` is a custom HTML reporter with run history, an AI root-cause tab and
a flaky-test diff. It is **commented out** in the config, and currently cannot be enabled as-is — it
imports from `src/ai/**` and `./selfHeal`, which do not exist in this repo yet.

## CI

`.github/workflows/playwright.yml` runs on every push and pull request to `main`/`master`:

1. `npm ci`
2. `npx playwright install --with-deps`
3. `npx playwright test`
4. Uploads `playwright-report/` as an artifact (30-day retention)

CI runs with 1 worker, 2 retries, and `forbidOnly` enabled.

## TypeScript

`tsconfig.json` is strict, targets ES2022/CommonJS, and defines path aliases (`@pages/*`, `@utils/*`,
`@api/*`, `@config/*`, `@fixtures/*`, `@testdata/*`). Playwright's own resolver does not honour these
aliases at runtime, so framework files import each other with relative paths; the aliases are there
for editor and type-level use.

## Known issues

- **Case-sensitivity on CI.** The tracked filename is `src/pages/loginPage.ts` (lowercase `l`) but
  `tests/login.spec.ts` imports `../src/pages/LoginPage`. This resolves on Windows/macOS and fails on
  Linux, so CI cannot currently import the page object. Rename the file to match the import.
- **`resolveBaseURL()` is unused** — see the env var note above.
- **Deprecated `tsconfig` options.** `moduleResolution: "node"` and `baseUrl` are deprecated and stop
  working in TypeScript 7. `npx tsc --noEmit` errors on both.
- **Empty page objects.** `ItemDetailsPage.ts`, `Checkout1Page.ts` and `inventoryPage.ts` are
  zero-byte placeholders.
- **Missing scripts.** `package.json` has an empty `scripts` block, so there is no `npm test`. Use
  `npx playwright test` directly.
