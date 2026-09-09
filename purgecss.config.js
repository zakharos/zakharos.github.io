module.exports = {
    content: [
        "_site/**/*.html",
        "_site/**/*.js"
    ],
    css: [
        "_site/assets/css/*.css"
    ],
    output: "_site/assets/css/",
    skippedContentGlobs: [
        "_site/assets/**/*.html"
    ],
    // Classes added at runtime by JS (publications compact view, portrait effects).
    safelist: {
        greedy: [/view-compact/, /view-detailed/, /expanded/, /fx-/, /pub-view-toggle/]
    }
};
