
window.onload = () => {
    /**
     * @type HTMLDivElement[]
     */
    let circles = document.querySelectorAll(".loadinganimation .circle");
    for(let i = 0; i < circles.length; i++) {
        let delay = i * 100;
        circles[i].style.animationDelay = delay.toString() + "ms";
    }
}