// Hər səhifədə avtomatik mətn console-a çıxsın

var mainEl = '';

if(document.querySelector('main') != ''){
    mainEl = document.querySelector('main');
    console.log('bura girdi main')
}else if(document.querySelector('article') != ''){
    mainEl = document.querySelector('article');
    console.log('bura girdi article')
}else{
    mainEl = document.body;
    console.log('bura girdi document.body')
}

let mainText = mainEl.innerText;
console.log(mainText);


// let article = new Readability(document.cloneNode(true)).parse();
// console.log(article.textContent);
