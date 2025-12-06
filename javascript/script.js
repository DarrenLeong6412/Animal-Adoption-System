console.log("JS connected")

//Change colour palette of navbar when scrolled
if (document.body.classList.contains("home")){
window.addEventListener("scroll", function(){

    const navbar = this.document.getElementById("navbar");

    if(this.window.scrollY > 80){
        navbar.classList.add("scrolled");
    }else{
        navbar.classList.remove("scrolled");
    }
});
}else{
    const navbar = this.document.getElementById("navbar");
    navbar.classList.add("scrolled");
}

//Hide or show sidebar
function showSidebar(){
    const sidebar = this.document.getElementById("sidebar");
    sidebar.style.right = '0';
}
function closeSidebar(){
    const sidebar = this.document.getElementById("sidebar");
    sidebar.style.right = '-100%';
}

