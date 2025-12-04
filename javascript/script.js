console.log("JS connected")
window.addEventListener("scroll", function(){

    const navbar = this.document.getElementById("navbar");

    if(this.window.scrollY > 1){
        navbar.classList.add("scrolled");
    }else{
        navbar.classList.remove("scrolled");
    }
});