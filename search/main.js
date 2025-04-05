import axios from 'axios';
import { debounce } from 'lodash-es';

const searchInput = document.querySelector('.search__input');
const resultsAnime = document.querySelector('.results__anime');
const resultsNotFound = document.querySelector('.results__404');
const recentlyWatchedSection = document.querySelector('.recently-watched');
const recentlyWatchedGrid = document.querySelector('.recently-watched__grid');
const recommendationsSection = document.querySelector('.recommendations');
const recommendationsGrid = document.querySelector('.recommendations__grid');
const backButton = document.querySelector('.back-button');

const API_BASE_URL = 'https://api.animetop.info/v1';
const cache = new Map();
let currentSearchTimeout;

// Инициализация
document.addEventListener("DOMContentLoaded", async () => {
    resultsNotFound.classList.add("hidden");
    createLoadingSpinner();

    try {
        await Promise.all([
            loadRecentlyWatched(),
            loadRecommendations()
        ]);
    } catch (error) {
        console.error('Failed to load initial data:', error);
    }
});

// API клиент
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
});

// Создание спиннера загрузки
function createLoadingSpinner() {
    const loading = document.createElement('div');
    loading.className = 'loading';
    const spinner = document.createElement('div');
    spinner.className = 'loading__spinner';
    loading.appendChild(spinner);
    document.querySelector('.results').appendChild(loading);
}

// Загрузка недавно просмотренных
async function loadRecentlyWatched() {
    const playFrom = JSON.parse(localStorage.getItem('playFrom')) || {};
    const recentAnimeIds = Object.keys(playFrom);

    if (recentAnimeIds.length === 0) {
        recentlyWatchedSection.classList.add('hidden');
        return;
    }

    recentlyWatchedSection.classList.remove('hidden');
    recentlyWatchedGrid.innerHTML = '';

    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-text';
    loadingElement.textContent = 'Загрузка истории просмотров...';
    recentlyWatchedGrid.appendChild(loadingElement);

    try {
        const animePromises = recentAnimeIds.map(async (animeId) => {
            try {
                const response = await apiClient.post('/info', `id=${animeId}`);
                if (response.data.state?.status === 'fail' || !response.data.data?.length) return null;
                return {
                    anime: response.data.data[0],
                    progress: playFrom[animeId]
                };
            } catch (error) {
                console.error(`Failed to load anime ${animeId}:`, error);
                return null;
            }
        });

        const animeResults = await Promise.all(animePromises);
        recentlyWatchedGrid.innerHTML = '';

        animeResults
            .filter(result => result !== null)
            .forEach((result, index) => {
                const animeElement = createAnimeElement(result.anime, result.progress);
                animeElement.style.setProperty('--i', index);
                recentlyWatchedGrid.appendChild(animeElement);
            });

    } catch (error) {
        console.error('Failed to load recently watched:', error);
        recentlyWatchedGrid.innerHTML = `
            <div class="error-message">
                Не удалось загрузить историю просмотров
                <button class="retry-button">
                    Повторить
                </button>
            </div>
        `;
        const retryButton = recentlyWatchedGrid.querySelector('.retry-button');
        retryButton.addEventListener('click', loadRecentlyWatched);
    }
}

// Загрузка рекомендаций
async function loadRecommendations() {
    try {
        recommendationsSection.classList.remove('hidden');
        recommendationsGrid.innerHTML = `
            <div class="loading-text">
                <div class="loading__spinner"></div>
                <p>Загрузка рекомендаций...</p>
            </div>
        `;

        // Проверяем кэш
        const cachedRecommendations = localStorage.getItem('recommendationsCache');
        if (cachedRecommendations) {
            const { date, anime } = JSON.parse(cachedRecommendations);
            if (date === new Date().toISOString().split('T')[0]) {
                renderRecommendations(anime);
                return;
            }
        }

        const animeList = [];
        const processedIds = new Set();

        // Получаем список аниме с разных страниц
        for (let page = 1; page <= 3; page++) {
            try {
                const response = await apiClient.get(`/last?page=${page}&quantity=10`);
                // Check if response.data is an array or if it has a data property that's an array
                const animeData = Array.isArray(response.data) ? response.data :
                                (response.data.data && Array.isArray(response.data.data) ? response.data.data : []);

                const newAnime = animeData.filter(anime =>
                    !processedIds.has(anime.id) && parseFloat(anime.rating) >= 4.5
                );

                newAnime.forEach(anime => {
                    processedIds.add(anime.id);
                    animeList.push(anime);
                });

                if (animeList.length >= 10) break;
            } catch (error) {
                console.error(`Failed to fetch page ${page}:`, error);
            }
        }

        if (animeList.length === 0) {
            recommendationsGrid.innerHTML = `
                <div class="error-message">
                    <h3>No recommendations available</h3>
                    <p>Could not find any recommendations at this time.</p>
                    <button class="retry-button">
                        <span class="retry-icon">↻</span>
                        Retry
                    </button>
                </div>
            `;
            const retryButton = recommendationsGrid.querySelector('.retry-button');
            retryButton.addEventListener('click', loadRecommendations);
            return;
        }

        // Сортируем по рейтингу и сохраняем в кэш
        const sortedAnime = animeList
            .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
            .slice(0, 10);

        localStorage.setItem('recommendationsCache', JSON.stringify({
            date: new Date().toISOString().split('T')[0],
            anime: sortedAnime
        }));

        renderRecommendations(sortedAnime);

    } catch (error) {
        console.error('Failed to load recommendations:', error);
        recommendationsGrid.innerHTML = `
            <div class="error-message">
                <h3>Не удалось загрузить рекомендации</h3>
                <p>Произошла ошибка при загрузке рекомендаций</p>
                <button class="retry-button">
                    <span class="retry-icon">↻</span>
                    Повторить попытку
                </button>
            </div>
        `;
        const retryButton = recommendationsGrid.querySelector('.retry-button');
        retryButton.addEventListener('click', loadRecommendations);
    }
}

// Отрисовка рекомендаций
function renderRecommendations(animeList) {
    recommendationsGrid.innerHTML = '';
    animeList.forEach((anime, index) => {
        const animeElement = createAnimeElement(anime);
        animeElement.style.setProperty('--i', index);
        recommendationsGrid.appendChild(animeElement);
    });
}

// Поиск аниме
const searchTitles = debounce(async () => {
    const searchTitle = searchInput.value.trim();

    if (searchTitle === '') {
        resultsAnime.innerHTML = '';
        resultsNotFound.classList.add('hidden');
        recentlyWatchedSection.classList.remove('hidden');
        recommendationsSection.classList.remove('hidden');
        return;
    }

    recentlyWatchedSection.classList.add('hidden');
    recommendationsSection.classList.add('hidden');
    resultsAnime.innerHTML = '';
    resultsNotFound.classList.add('hidden');

    const loading = document.querySelector('.loading');
    loading.classList.add('active');

    try {
        let results;
        if (cache.has(searchTitle)) {
            results = cache.get(searchTitle);
        } else {
            const response = await apiClient.post('/search', `name=${searchTitle}`);
            if (response.data.status === 'fail' || !response.data.data?.length) {
                return notFound();
            }
            results = response.data.data;
            cache.set(searchTitle, results);
        }
        renderResults(results);
    } catch (error) {
        console.error('Search failed:', error);
        notFound();
    }
}, 500);

// Обработчики событий поиска
searchInput.addEventListener('input', searchTitles);
searchInput.addEventListener('search', () => {
    searchInput.blur();
    searchTitles();
});

// Отрисовка результатов поиска
function renderResults(resultsTitles) {
    const loading = document.querySelector('.loading');
    loading.classList.remove('active');

    resultsAnime.innerHTML = '';
    resultsTitles.forEach((anime, index) => {
        const animeElement = createAnimeElement(anime);
        animeElement.style.setProperty('--i', index);
        resultsAnime.appendChild(animeElement);
    });

    resultsAnime.classList.remove('hidden');
    resultsNotFound.classList.add('hidden');
}

// Отображение "ничего не найдено"
function notFound() {
    const loading = document.querySelector('.loading');
    loading.classList.remove('active');
    resultsAnime.classList.add('hidden');
    resultsNotFound.classList.remove('hidden');
}

// Создание карточки аниме
function createAnimeElement(anime, watchProgress = null) {
    const animeElement = document.createElement('div');
    animeElement.classList.add('anime');
    animeElement.dataset.id = anime.id;

    const animePosterLink = document.createElement('a');
    animePosterLink.href = `../anime/?id=${anime.id}${watchProgress ? `&seria=${watchProgress.seria}` : ''}`;
    animePosterLink.classList.add('anime__poster-link');

    const animePoster = document.createElement('img');
    animePoster.classList.add('anime__poster');
    animePoster.src = anime.urlImagePreview.replace('http://', 'https://');
    animePoster.alt = anime.title;
    animePoster.loading = 'lazy';

    animePoster.onerror = function() {
        this.src = 'https://via.placeholder.com/350x500?text=Изображение+не+найдено';
    };

    const animeDetails = document.createElement('div');
    animeDetails.classList.add('anime__details');

    const animeTitle = document.createElement('a');
    animeTitle.classList.add('anime__title');
    animeTitle.textContent = anime.title;
    animeTitle.href = animePosterLink.href;
    animeTitle.title = anime.title;

    const animeInfo = document.createElement('div');
    animeInfo.classList.add('anime__info');

    const rating = parseFloat(anime.rating);
    const ratingText = rating ? `⭐ ${rating.toFixed(1)}` : 'Нет оценок';
    const genresText = anime.genres?.length ? anime.genres.join(', ') : 'Жанры не указаны';

    animeInfo.innerHTML = `
        <div class="anime__rating">${ratingText}</div>
        <div class="anime__genres">${genresText}</div>
    `;

    if (watchProgress) {
        const progressBar = document.createElement('div');
        progressBar.classList.add('anime__progress');
        const progressFill = document.createElement('div');
        progressFill.classList.add('anime__progress-bar');
        progressFill.style.width = `${(watchProgress.time / anime.duration) * 100}%`;
        progressBar.appendChild(progressFill);
        animeDetails.appendChild(progressBar);
    }

    animePosterLink.appendChild(animePoster);
    animeDetails.appendChild(animeTitle);
    animeDetails.appendChild(animeInfo);
    animeElement.appendChild(animePosterLink);
    animeElement.appendChild(animeDetails);

    return animeElement;
}

// Обработчик кнопки "Вернуться к рекомендациям"
backButton?.addEventListener('click', () => {
    searchInput.value = '';
    resultsNotFound.classList.add('hidden');
    recentlyWatchedSection.classList.remove('hidden');
    recommendationsSection.classList.remove('hidden');
});
