const searchInput = document.querySelector('.search__input');
const resultsAnime = document.querySelector('.results__anime');
const resultsNotFound = document.querySelector('.results__404');

const cache = new Map();
let searchTimeout;

searchInput.value = '';

document.addEventListener("DOMContentLoaded", () => {
    resultsNotFound.classList.add("hidden");
    createLoadingSpinner();
});

// Создаем элемент загрузки
function createLoadingSpinner() {
    const loading = document.createElement('div');
    loading.className = 'loading';
    const spinner = document.createElement('div');
    spinner.className = 'loading__spinner';
    loading.appendChild(spinner);
    document.querySelector('.results').appendChild(loading);
}

// Добавляем обработчик ввода для автоматического поиска
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchTitles();
    }, 500);
});

searchInput.addEventListener('search', () => {
    searchInput.blur();
    searchTitles();
});

async function searchTitles() {
    let searchTitle = searchInput.value.trim();
    if (searchTitle === '') return;

    resultsAnime.innerHTML = '';
    resultsNotFound.classList.add('hidden');

    // Показываем загрузку
    const loading = document.querySelector('.loading');
    loading.classList.add('active');

    let resultsTitles;
    if (cache.has(searchTitle)) {
        resultsTitles = cache.get(searchTitle);
        renderResults(resultsTitles);
    } else {
        try {
            let response = await fetch('https://api.animetop.info/v1/search', {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `name=${searchTitle}`
            });
            resultsTitles = await response.json();
            if (resultsTitles.status === 'fail' || !resultsTitles.data.length) {
                return notFound();
            }
            resultsTitles = resultsTitles.data;
            cache.set(searchTitle, resultsTitles);
            renderResults(resultsTitles);
        } catch (e) {
            console.error(e);
            return notFound();
        }
    }
}

function renderResults(resultsTitles) {
    // Скрываем загрузку
    const loading = document.querySelector('.loading');
    loading.classList.remove('active');

    resultsTitles.forEach(anime => {
        resultsAnime.appendChild(createAnimeElement(anime));
    });

    // Добавляем анимацию появления карточек
    const cards = document.querySelectorAll('.anime');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });

    resultsAnime.classList.remove('hidden');
    resultsNotFound.classList.add('hidden');
}

function notFound() {
    const loading = document.querySelector('.loading');
    loading.classList.remove('active');
    resultsAnime.classList.add('hidden');
    resultsNotFound.classList.remove('hidden');
}

function createAnimeElement(anime) {
    let animeElement = document.createElement('div');
    animeElement.classList.add('anime');
    animeElement.dataset.id = anime.id;

    let animePosterLink = document.createElement('a');
    animePosterLink.href = `../anime/?id=${anime.id}`;

    let animePoster = document.createElement('img');
    animePoster.classList.add('anime__poster');
    animePoster.src = anime.urlImagePreview.replace('https://', 'http://');
    animePoster.alt = anime.title;

    // Добавляем обработку ошибки загрузки изображения
    animePoster.onerror = function() {
        this.src = 'https://via.placeholder.com/350x500?text=Image+Not+Found';
    };

    let animeDetails = document.createElement('div');
    animeDetails.classList.add('anime__details');

    let animeTitle = document.createElement('a');
    animeTitle.classList.add('anime__title');
    animeTitle.textContent = anime.title;
    animeTitle.href = `../anime/?id=${anime.id}`;

    let animeInfo = document.createElement('div');
    animeInfo.classList.add('anime__info');
    animeInfo.innerHTML = `<span>⭐ ${anime.rating || 'N/A'}</span> | <span>${anime.genres?.join(', ') || 'Жанры неизвестны'}</span>`;

    animePosterLink.appendChild(animePoster);
    animeDetails.appendChild(animeTitle);
    animeDetails.appendChild(animeInfo);
    animeElement.appendChild(animePosterLink);
    animeElement.appendChild(animeDetails);

    return animeElement;
}
