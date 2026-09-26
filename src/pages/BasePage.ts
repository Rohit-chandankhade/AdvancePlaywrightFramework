/**
 * BasePage - shared scaffolding for every TTACart Page Object.
 *
 * The TTACart suite is intentionally thin. We only inherit:
 *  - `page`     -> Playwright Page handle
 *  - `el`       -> UtilElementLocator wrapper for actions
 *  - `log`      -> a per-page Logger (scope = the subclass name)
 *  - `goto(p)`  -> small navigation helper that respects baseURL
 *
 * Subclasses still declare their own `private readonly` Locator fields; the
 * base class deliberately does NOT pre-build any locators.
 */
import { Page } from '@playwright/test'

abstract class BasePage {


    protected readonly page: Page;

    constructor(page: Page) {
        this.page = page
    }

    // Why do we need this?
    // When Playwright runs a test, it gives you a browser page:
    // test('Login Test', async ({ page }) => {
    // If you create a Page Object:
    // const loginPage = new LoginPage(page);
    // the page object is passed to the constructor.
    // constructor(page: Page) {
    //     this.page = page;
    // }

    // This stores the Playwright page in the class so that all methods can use it.

    // Without this
    // this.page = page;
    // the class would not know which browser page to interact with.


    protected async goto(relativepath: string): Promise<void> {

        await this.page.goto(relativepath);
        await this.page.waitForLoadState("domcontentloaded");

    }

}