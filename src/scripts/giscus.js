
const currentScript = document.currentScript; // A reference to the currently running script

function createScriptTag() {
    const script = document.createElement('script');// Create a new div

    script.src = "https://giscus.app/client.js"
    script.setAttribute('data-repo', "JamesMcNee/static-blog-site")
    script.setAttribute('data-repo-id', "R_kgDOKXuhyQ")
    script.setAttribute('data-category', "Announcements")
    script.setAttribute('data-category-id', "DIC_kwDOKXuhyc4CZ6Gh")
    script.setAttribute('data-mapping', "pathname")
    script.setAttribute('data-strict', "0")
    script.setAttribute('data-reactions-enabled', "0")
    script.setAttribute('data-emit-metadata', "0")
    script.setAttribute('data-input-position', "bottom")
    script.setAttribute('data-theme', "noborder_dark")
    script.setAttribute('data-lang', "en")
    script.setAttribute('data-loading', "lazy")
    script.setAttribute('crossorigin', "anonymous")
    script.setAttribute('async', "true")

    return script
}

currentScript.parentElement.insertBefore(createScriptTag(), currentScript); // Add the newly-created div to the page

let commentsReady = false
addEventListener('message', event => {
    if (event.origin !== 'https://giscus.app') {
        return;
    }

    commentsReady = true

    applyTheme()
});

document.addEventListener('theme-changed', () => {
    if (commentsReady) {
        applyTheme()
    }
})

function applyTheme() {
    const preferredColourScheme = getPreferredColourScheme()

    const giscusTheme = preferredColourScheme === 'dark' ? 'transparent_dark' : 'light'


    const message = {
        setConfig: {
            theme: giscusTheme
        }
    };

    const iframe = document.getElementsByClassName('giscus-frame')?.[0];

    if (!iframe) {
        return;
    }

    iframe.contentWindow.postMessage({ giscus: message }, 'https://giscus.app');
}