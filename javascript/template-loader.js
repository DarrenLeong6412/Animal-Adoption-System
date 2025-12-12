//Reuse navigationbar and footer
async function loadTemplate(id, target) {
    const res = await fetch("components.html");
    const text = await res.text();

    // create a temporary document to read the templates
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    const template = doc.getElementById(id);
    document.getElementById(target).appendChild(template.content.cloneNode(true));
}
loadTemplate("navbar-template", "navbar");
loadTemplate("footer-template", "footer");