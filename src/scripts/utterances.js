
const currentScript = document.currentScript; // A reference to the currently running script

const loadingSpinner = document.getElementById("utterances-spinner")

function createUtterancesScriptTag() {
    const script = document.createElement('script');// Create a new div

    script.src = "https://utteranc.es/client.js"
    script.setAttribute('repo', "JamesMcNee/static-blog-site")
    script.setAttribute('issue-term', "pathname")
    script.setAttribute('theme', "preferred-color-scheme")
    script.setAttribute('crossorigin', "anonymous")
    script.setAttribute('async', "true")

    return script
}

currentScript.parentElement.insertBefore(createUtterancesScriptTag(), currentScript); // Add the newly-created div to the page

let utterancesReady = false
addEventListener('message', event => {
    if (event.origin !== 'https://utteranc.es') {
        return;
    }

    utterancesReady = true

    loadingSpinner.remove()
    applyUtterancesTheme()
});

document.addEventListener('theme-changed', () => {
    if (utterancesReady) {
        applyUtterancesTheme()
    }
})

function applyUtterancesTheme() {
    const preferredColourScheme = getPreferredColourScheme()

    const utterancesTheme = preferredColourScheme === 'dark' ? 'dark-blue' : 'boxy-light'

    const message = {
        type: 'set-theme',
        theme: utterancesTheme
    };

    const utterancesIframe = document.getElementsByClassName('utterances-frame')?.[0];
    utterancesIframe.contentWindow.postMessage(message, 'https://utteranc.es');
}