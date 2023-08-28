// For more information, see https://crawlee.dev/
import {PlaywrightCrawler, Dataset, sleep} from 'crawlee';
import * as fs from "fs";

import http from "http"; // or 'https' for https:// URLs

import {DownloaderHelper} from "node-downloader-helper";

const STORAGE_PAGE = "../website"
// PlaywrightCrawler crawls the web using a headless
// browser controlled by the Playwright library.
const black_links = ["logout", "members"]
const skip_links = new Set()
const replaceLinks = {
    "https://ieltsonline.com/academic": "/academic",
    "https://ieltsonline.com/checkout-select-course-package": "/checkout-select-course-package",
    "https://ieltsonline.com/checkout-select-course-type": "/checkout-select-course-type",
    "https://ieltsonline.com/courses": "/courses",
    "https://ieltsonline.com/general-training": "/general-training",
    "https://ieltsonline.com/members": "/members",
    "https://ieltsonline.com/lessons": "/lessons",
    "https://ieltsonline.com/my-account": "/my-account",
    "https://ieltsonline.com/privacy-policy": "/privacy-policy",
    "https://ieltsonline.com/signup": "/signup",
    "https://ieltsonline.com/terms-of-service": "/terms-of-service",
    "https://ieltsonline.com/topic": "/topic",
    "https://ieltsonline.com/wp-content/uploads": "/wp-content/uploads",
    "https://ieltsonline.com/": "/",
}
const crawler = new PlaywrightCrawler({
        headless: false,

        autoscaledPoolOptions: {
            maxConcurrency: 10
        },
        maxRequestsPerMinute: 50,
        maxConcurrency: 10,
        launchContext: {
            launchOptions: {
                // headless: false,
                // executablePath: '/Applications/Google Chrome/Contents/MacOS/Google Chrome', // For MacOS
                executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // For MacOS
                // executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', // For Windows
                // executablePath: '/usr/bin/google-chrome'  // For Linux
                args: [
                    //"--disable-accelerated-2d-canvas",
                    '--no-sandbox',
                    '--start-maximized',
                    '--ignore-certificate-errors',
                    // "--disable-sync",

                    '--allow-pre-commit-input',
                    // '--disable-background-networking',
                    // '--disable-background-timer-throttling',
                    // '--disable-backgrounding-occluded-windows',
                    // '--disable-breakpad',
                    '--disable-client-side-phishing-detection',
                    // '--disable-component-extensions-with-background-pages',
                    // '--disable-component-update',
                    // '--disable-default-apps',
                    '--disable-dev-shm-usage',
                    '--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter,OptimizationHints',
                    '--disable-hang-monitor',
                    '--disable-ipc-flooding-protection',
                    '--disable-popup-blocking',
                    // '--disable-prompt-on-repost',
                    // '--disable-renderer-backgrounding',
                    // '--disable-sync',
                    // '--enable-automation',
                    '--enable-blink-features=IdleDetection',
                    '--enable-features=NetworkServiceInProcess2',
                    '--export-tagged-pdf',
                    '--force-color-profile=srgb',
                    '--metrics-recording-only',
                    // '--no-first-run',
                    '--password-store=basic',
                    '--use-mock-keychain',
                    // '--hide-scrollbars',

                    // "--in-process-gpu",
                    // "--enable-low-res-tiling",
                    // "--enable-low-end-device-mode",
                    // "--disable-site-isolation-trials",
                    // "--renderer-process-limit=1",
                    '--disable-features=WebRtcHideLocalIpsWithMdns',
                    '--disable-web-security',
                    '--disable-features=UserAgentClientHint',
                    '--disable-infobars',
                    // '--enable-automation'
                    // `--proxy-server=${this.#extra.proxy}`
                ]
            },
            useChrome: true,
            // userDataDir: "/Users/thanh/Library/Application Support/Google/Chrome/",
            userDataDir: "../thanhnv",
        },
        // Use the requestHandler to process each of the crawled pages.
        async requestHandler({request, page, enqueueLinks, log}) {
            // await sleep(100000000);

            const title = await page.title();
            log.info(`Title of ${request.loadedUrl} is '${title}'`);
            const html = await page.content()

            for (let replaceLinksKey in replaceLinks) {
                // @ts-ignore
                let val = replaceLinks[replaceLinksKey];
                html.replace(replaceLinksKey, val)
            }

            let url = request.loadedUrl || ""
            // Save results as JSON to ./storage/datasets/default
            let _url = new URL(url);
            let hostname = _url.hostname;
            let pathname = _url.pathname;
            let _path = STORAGE_PAGE + "/" + hostname + "/" + pathname

            if (url.includes(".pdf")) {

                let fileName = pathname.substr(pathname.lastIndexOf("/"), pathname.length);
                pathname = pathname.substr(0, pathname.lastIndexOf("/"));
                let _path = STORAGE_PAGE + "/" + hostname + "/" + pathname
                fs.mkdirSync(_path, {recursive: true});


                // URL of the image
                const dl = new DownloaderHelper(url, _path);
                dl.on('end', () => console.log('Download Completed'))
                dl.start();
                return
            }
            fs.mkdirSync(_path, {recursive: true});

            fs.writeFileSync(_path + "/index.html", html);
            await Dataset.pushData({title, url: request.loadedUrl, html: html});

            // Extract links from the current page
            let hrefs = await page.evaluate(() => {
                return Array.from(document.links).map(item => item.href);
            });
            let links = [];
            for (const href of hrefs) {
                let skip = false;
                for (const blackLink of black_links) {
                    if (href.includes(blackLink)) {
                        skip = true
                        break
                    }
                }
                if (skip || skip_links.has(href)) {
                    continue
                }
                links.push(href);

                skip_links.add(href)
            }

            // and add them to the crawling queue.
            await enqueueLinks({urls: links});

        },
        // Uncomment this option to see the browser window.
        // headless: false,
    }
);

// Add first URL to the queue and start the crawl.
await crawler.run(['https://ieltsonline.com/lessons/types-of-visuals/']);
