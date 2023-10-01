/**
 * Will update the value of any element with the class 'scroll-position' with the current scroll position of the page...
 */
document.addEventListener('DOMContentLoaded', function() {
    const scrollProgressElements = document.getElementsByClassName('scroll-progress')
    window.addEventListener('scroll', function() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;

        for (const element of scrollProgressElements) {
            element.value = (winScroll / height) * 100
        }
    });
});