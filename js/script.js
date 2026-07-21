const menuBtn = document.querySelector(".menu-btn");
const navMenu = document.querySelector("nav ul");

menuBtn.addEventListener("click", () => {

    navMenu.classList.toggle("active");

});

const text = [
    "Data Analyst",
    "SQL Developer",
    "Power BI Developer",
    "Python Programmer",
    "Freelancer"
];

let index = 0;

const typing = document.getElementById("typing");

function changeText(){

    typing.textContent = text[index];

    index++;

    if(index >= text.length){

        index = 0;

    }

}

changeText();

setInterval(changeText,2000);

const sections = document.querySelectorAll("section");

const observer = new IntersectionObserver((entries) => {

    entries.forEach((entry) => {

        if(entry.isIntersecting){
            entry.target.classList.add("show");
        }

    });

});

sections.forEach((section) => {

    section.classList.add("hidden");
    observer.observe(section);

});

const contactForm = document.querySelector(".contact-form");

contactForm.addEventListener("submit", function(e){

    e.preventDefault();

    alert("Thank you! Your message has been received.");

    contactForm.reset();

});

const themeToggle = document.getElementById("theme-toggle");

themeToggle.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    if(document.body.classList.contains("dark")){

        themeToggle.textContent = "☀️";

    }else{

        themeToggle.textContent = "🌙";

    }

});

const topBtn = document.getElementById("topBtn");

window.addEventListener("scroll", () => {

    if(document.documentElement.scrollTop > 300){

        topBtn.style.display = "block";

    }else{

        topBtn.style.display = "none";

    }

});

topBtn.addEventListener("click", () => {

    window.scrollTo({
        top:0,
        behavior:"smooth"
    });

});