function addOnClickOutsideListener(element, func) {
    const isVisible = elem => !!elem && !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);

    const outsideClickListener = event => {
        if (!element.contains(event.target) && isVisible(element)) {
            func(element);
            removeClickListener();
        }
    }

    const removeClickListener = () => {
        element.removeAttribute('click-outside-attached')
        document.removeEventListener('click', outsideClickListener);
    }

    if (element.getAttribute('click-outside-attached') !== 'true') {
        element.setAttribute('click-outside-attached', 'true')
        document.addEventListener('click', outsideClickListener);
    }
}

function debounce(func, timeout = 250) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, timeout);
    };
}