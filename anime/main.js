const player = document.querySelector('.player');

const isTouch = () => (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
if (isTouch()) player.classList.add('touch');

const video = player.querySelector('.player__video');
const episodeSelector = player.querySelector('.player__episode');
const currentEpisode = episodeSelector.querySelector('.current-episode');
const episodeList = episodeSelector.querySelector('.episode-list');
const ui = player.querySelector('.player__ui');
const progress = ui.querySelector('.ui__progress');
const progressContainer = progress.querySelector('.ui__progress--container');
const progressCurrent = progressContainer.querySelector('.progress__current');
const progressSearch = progressContainer.querySelector('.progress__search');
const progressBuffered = progressContainer.querySelector('.progress__buffered');
const controls = ui.querySelector('.ui__controls');
const controlsLeft = controls.querySelector('.ui__btns--left');
const controlsRight = controls.querySelector('.ui__btns--right');
const backwardBtn = controlsLeft.querySelector('.ui__btn--backward');
const playBtn = controlsLeft.querySelector('.ui__btn--play');
const forwardBtn = controlsLeft.querySelector('.ui__btn--forward');
const volume = controlsLeft.querySelector('.ui__volume');
const volumeContainer = volume.querySelector('.ui__volume--container');
const volumeBtn = volume.querySelector('.ui__btn--volume');
const volumeCurrent = volumeContainer.querySelector('.volume__current');
const volumeSearch = volumeContainer.querySelector('.volume__search');
const timepointCurrent = controlsLeft.querySelector('.timepoint__current');
const timepointSearch = ui.querySelector('.timepoint__search');
const timepointDuration = controlsLeft.querySelector('.timepoint__duration');
const speedBtn = controlsRight.querySelector('.ui__btn--speed');
const pipBtn = controlsRight.querySelector('.ui__btn--pip');
const fullscreenBtn = controlsRight.querySelector('.ui__btn--fullscreen');
const headTitle = document.head.querySelector('title');

// Double tap areas
const leftTapArea = player.querySelector('.double-tap-area.left');
const rightTapArea = player.querySelector('.double-tap-area.right');
const leftIndicator = player.querySelector('.double-tap-indicator.left');
const rightIndicator = player.querySelector('.double-tap-indicator.right');

let lastTapTime = 0;
const DOUBLE_TAP_DELAY = 300;
const SEEK_TIME = 10;

function handleDoubleTap(direction) {
    const currentTime = Date.now();
    const tapLength = currentTime - lastTapTime;

    if (tapLength < DOUBLE_TAP_DELAY) {
        if (direction === 'left') {
            video.currentTime = Math.max(0, video.currentTime - SEEK_TIME);
            leftIndicator.classList.add('active');
            setTimeout(() => leftIndicator.classList.remove('active'), 300);
        } else {
            video.currentTime = Math.min(video.duration, video.currentTime + SEEK_TIME);
            rightIndicator.classList.add('active');
            setTimeout(() => rightIndicator.classList.remove('active'), 300);
        }
    }
    lastTapTime = currentTime;
}

leftTapArea.addEventListener('touchstart', () => handleDoubleTap('left'));
rightTapArea.addEventListener('touchstart', () => handleDoubleTap('right'));

// Episode selector functionality
episodeSelector.addEventListener('click', (e) => {
    e.stopPropagation();
    episodeList.classList.toggle('visible');
});

document.addEventListener('click', (e) => {
    if (!episodeSelector.contains(e.target)) {
        episodeList.classList.remove('visible');
    }
});

const keyBinding = {
    'KeyI': function() {
        video.playbackRate = clamp(video.playbackRate - 0.25, 0.25, 2);
    },
    'KeyO': function() {
        video.playbackRate = clamp(video.playbackRate + 0.25, 0.25, 2);
    },
    'Space': toggleVideo,
    'KeyK': toggleVideo,
    'KeyM': toggleVolume,
    'KeyF': toggleFullscreen,
    'KeyP': togglePIP,
    'KeyL': function() {
        video.currentTime = clamp(video.currentTime + Math.ceil(10 * video.playbackRate), 0, video.duration);
    },
    'KeyJ': function() {
        video.currentTime = clamp(video.currentTime - Math.ceil(10 * video.playbackRate), 0, video.duration);
    },
    'ArrowRight': function() {
        video.currentTime = clamp(video.currentTime + Math.ceil(5 * video.playbackRate), 0, video.duration);
    },
    'ArrowLeft': function() {
        video.currentTime = clamp(video.currentTime - Math.ceil(5 * video.playbackRate), 0, video.duration);
    },
    'ArrowUp': function() {
        video.volume = clamp(video.volume + 0.02, 0, 1);
        video.muted = false;
    },
    'ArrowDown': function() {
        video.volume = clamp(video.volume - 0.02, 0, 1);
    }
};

window = window.self;

let progressOn = false,
    progressMove = false,
    volumeOn = false,
    volumeMove = false,
    contextmenuCounter = 1,
    contextmenuTimeout = 0;

player.addEventListener('contextmenu', (e) => {
    if (contextmenuCounter % 2 === 1) {
        clearTimeout(contextmenuTimeout);
        e.preventDefault();
    }
    contextmenuTimeout = setTimeout(() => {
        contextmenuCounter = 1;
    }, 200);
    contextmenuCounter++;
});

function clamp(val, min, max) {
    return Math.max(min, Math.min(val, max));
}

function onLoad() {
    let data, id;
    setProgressCurrent(0);
    setTimepointSearch(timepointSearch.offsetWidth / 2 + 8);
}

addEventListener('load', onLoad);
addEventListener('hashchange', onLoad);

video.addEventListener('loadeddata', () => {
    player.classList.add('loaded');
});

video.addEventListener('loadstart', () => {
    player.classList.remove('loaded');
    onLoad();
});

const setVolumeStorage = () => localStorage.setItem('volume', JSON.stringify({
    volume: video.volume,
    muted: video.muted
}));

function setFromStorage() {
    let volumeStorage = localStorage.getItem('volume');

    if (volumeStorage) {
        volumeStorage = JSON.parse(volumeStorage);
        video.volume = volumeStorage.volume;
        video.muted = volumeStorage.muted;
    } else {
        setVolumeStorage();
    }
    handleVolume();
}

setFromStorage();

const map = (value, x1, y1, x2, y2) => (value - x1) * (y2 - x2) / (y1 - x1) + x2;

function formatTime(sec) {
    var hours = Math.floor(sec / 3600);
    var minutes = Math.floor((sec - (hours * 3600)) / 60);
    var seconds = Math.floor(sec - (hours * 3600) - (minutes * 60));
    seconds = String(seconds).padStart(2, '0');

    if (hours > 0) minutes = String(minutes).padStart(2, '0');

    return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

function previousSeria() {
    forwardBtn.classList.toggle('hidden', false);
    if (0 !== seria) {
        seria = seria - 1;
        selectSeria();
    }
}

function toggleVideo() {
    if (video.paused) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Autoplay prevented:", error);
            });
        }
    } else {
        video.pause();
    }
}

function nextSeria() {
    backwardBtn.classList.toggle('hidden', false);
    if (playlist.length - 1 !== seria) {
        forwardBtn.classList.toggle('hidden', false);
        seria = seria + 1;
        selectSeria();
    }
}

function toggleVolume() {
    video.muted = !video.muted;

    if (!video.muted && video.volume === 0) video.volume = 0.5;
}

function togglePIP() {
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
        video.requestPictureInPicture().catch(error => {
            console.log("PiP error:", error);
        });
    }
}

function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else if (player.requestFullscreen) {
        player.requestFullscreen();
    }
}

function setTimepointSearch(left) {
    timepointSearch.style.left = `${left}px`;
}

function setProgressCurrent(width) {
    progressCurrent.style.width = `${width}%`;
}

function setProgressSearch(width) {
    progressSearch.style.width = `${width}%`;
}

function setProgressBuffered(width) {
    progressBuffered.style.width = `${width}%`;
}

function setVolumeCurrent(width) {
    volumeCurrent.style.width = `${width}%`;
}

function handleVolume() {
    volumeBtn.classList.remove('icon__volume--mute');
    volumeBtn.classList.remove('icon__volume--low');
    volumeBtn.classList.remove('icon__volume--high');

    if (video.volume === 0) video.muted = true;
    setVolumeStorage();
    setVolumeCurrent(video.muted ? 0 : video.volume * 100);
    video.muted ? volumeBtn.classList.add('icon__volume--mute') : (video.volume > 0.5 ? volumeBtn.classList.add('icon__volume--high') : volumeBtn.classList.add('icon__volume--low'));
}

function handleFullscreen() {
    fullscreenBtn.classList.toggle('icon__expand');
    fullscreenBtn.classList.toggle('icon__compress');
    player.classList.toggle('fullscreen');
}

function handleDuration() {
    timepointDuration.textContent = formatTime(video.duration);
}

function handleUpdate() {
    timepointCurrent.textContent = formatTime(video.currentTime);
    setProgressCurrent(video.currentTime / video.duration * 100);
}

function handleProgress() {
    if (video.buffered.length > 0) {
        for (let i = 0; i < video.buffered.length; i++) {
            if (video.buffered.start(i) <= video.currentTime && video.currentTime <= video.buffered.end(i)) {
                setProgressBuffered(video.buffered.end(i) / video.duration * 100);
                break;
            }
        }
    } else {
        setProgressBuffered(0);
    }
}

function handlePlay() {
    playBtn.classList.remove('icon__play');
    playBtn.classList.add('icon__pause');
    player.classList.remove('paused');
    player.classList.add('playing');
    clearTimeout(playerHiddenTimeOut);
    playerHiddenTimeOut = setTimeout(() => {
        if (player.classList.contains('playing')) {
            player.classList.add('hidden');
            player.querySelector('.player__header').classList.add('hidden');
        }
    }, 2000);
}

function handlePause() {
    playBtn.classList.remove('icon__pause');
    playBtn.classList.add('icon__play');
    player.classList.remove('playing');
    player.classList.add('paused');
    player.classList.remove('hidden');
    player.querySelector('.player__header').classList.remove('hidden');
}

function handleRate() {
    speedBtn.innerHTML = `×${video.playbackRate}`;
}

let playerHiddenTimeOut;

player.addEventListener('pointermove', () => {
    if (player.classList.contains('playing')) {
        player.classList.remove('hidden');
        player.querySelector('.player__header').classList.remove('hidden');
        clearTimeout(playerHiddenTimeOut);
        playerHiddenTimeOut = setTimeout(() => {
            if (player.classList.contains('playing')) {
                player.classList.add('hidden');
                player.querySelector('.player__header').classList.add('hidden');
            }
        }, 2000);
    }
});

let clickCounter = 1,
    clickTimeout = 0,
    playTimeout = 0;

video.addEventListener('click', (e) => {
    if (e.which === 1) {
        if (clickCounter % 2 === 0) {
            clearTimeout(playTimeout);
            toggleFullscreen();
        } else {
            clearTimeout(clickTimeout);
            playTimeout = setTimeout(() => {
                toggleVideo();
            }, 200);
        }
        clickTimeout = setTimeout(() => {
            clickCounter = 1;
        }, 200);
        clickCounter++;
    }
});

backwardBtn.addEventListener('click', (e) => {
    if (e.which === 1) previousSeria();
});

playBtn.addEventListener('click', (e) => {
    if (e.which === 1) toggleVideo();
});

forwardBtn.addEventListener('click', (e) => {
    if (e.which === 1) nextSeria();
});

volumeBtn.addEventListener('click', (e) => {
    if (e.which === 1) toggleVolume();
});

video.addEventListener('volumechange', handleVolume);

fullscreenBtn.addEventListener('click', (e) => {
    if (e.which === 1) toggleFullscreen();
});

addEventListener('fullscreenchange', handleFullscreen);

pipBtn.addEventListener('click', (e) => {
    if (e.which === 1) togglePIP();
});

video.addEventListener('durationchange', handleDuration);

video.addEventListener('timeupdate', handleUpdate);

video.addEventListener('progress', handleProgress);

video.addEventListener('playing', handlePlay);

video.addEventListener('pause', handlePause);

speedBtn.addEventListener('click', (e) => {
    if (e.which === 1) video.playbackRate = video.playbackRate === 1 ? 2 : 1;
});

video.addEventListener('ratechange', handleRate);

video.addEventListener('waiting', handlePause);

progress.addEventListener('pointerenter', () => {
    timepointSearch.classList.add('visible');
});

progress.addEventListener('pointerleave', () => {
    if (!progressOn) {
        timepointSearch.classList.remove('visible');
        setProgressSearch(0);
    }
});

progress.addEventListener('pointerdown', (e) => {
    if (e.which === 1) progressOn = true;
    window.dispatchEvent(new PointerEvent('pointermove', e));
});

progress.addEventListener('pointermove', (e) => {
    let time = map(clamp(e.pageX, progress.getBoundingClientRect().left, progress.getBoundingClientRect().right) - progress.getBoundingClientRect().left, 0, progress.offsetWidth, 0, video.duration);
    if (!isNaN(time)) {
        setProgressSearch(time / video.duration * 100);
        setTimepointSearch(clamp(e.pageX, timepointSearch.offsetWidth / 2 + 8, player.offsetWidth - timepointSearch.offsetWidth / 2 - 8));
        timepointSearch.textContent = formatTime(time);
    }
});

volume.addEventListener('pointerenter', () => {
    volume.classList.add('hover');
});

volume.addEventListener('pointerleave', () => {
    if (!volumeOn) {
        volume.classList.remove('hover');
    }
});

volumeContainer.addEventListener('pointerdown', (e) => {
    if (e.which === 1) volumeOn = true;
    window.dispatchEvent(new PointerEvent('pointermove', e));
});

const pointerMove = ({ pageX }) => {
    if (progressOn) {
        progressMove = true;
        let time = map((clamp(pageX, progress.getBoundingClientRect().left, progress.getBoundingClientRect().right) - progress.getBoundingClientRect().left), 0, progress.offsetWidth, 0, video.duration);
        setProgressCurrent(time / video.duration * 100);
        setTimepointSearch(clamp(pageX, timepointSearch.offsetWidth / 2 + 8, player.offsetWidth - timepointSearch.offsetWidth / 2 - 8));
        timepointSearch.textContent = formatTime(time);
    }
    if (volumeOn) {
        volumeMove = true;
        video.volume = (clamp(pageX, volumeContainer.getBoundingClientRect().left, volumeContainer.getBoundingClientRect().right) - volumeContainer.getBoundingClientRect().left) / 50;
        video.muted = false;
    }
};

addEventListener('mousemove', pointerMove);
addEventListener('touchmove', (e) => {
    pointerMove({
        pageX: e.touches[0].pageX
    });
});

const pointerUp = (e) => {
    if (progressOn) {
        const pageX = 'pageX' in e ? e.pageX : e.changedTouches[0].pageX;
        progressOn = false;
        if (progressMove) progress.dispatchEvent(new PointerEvent('pointerleave'));
        progressMove = false;
        video.currentTime = map((clamp(pageX, progress.getBoundingClientRect().left, progress.getBoundingClientRect().right) - progress.getBoundingClientRect().left), 0, progress.offsetWidth, 0, video.duration);
    }
    if (volumeOn) {
        const pageX = 'pageX' in e ? e.pageX : e.changedTouches[0].pageX;
        volumeOn = false;
        if (volumeMove) volume.dispatchEvent(new PointerEvent('pointerleave'));
        volumeMove = false;
        video.volume = (clamp(pageX, volumeContainer.getBoundingClientRect().left, volumeContainer.getBoundingClientRect().right) - volumeContainer.getBoundingClientRect().left) / 50;
    }
};

addEventListener('mouseup', pointerUp);
addEventListener('touchend', pointerUp);

addEventListener('keydown', (e) => {
    if (keyBinding.hasOwnProperty(e.code))
        keyBinding[e.code]();
    if (document.activeElement.classList.contains('ui__btn') && e.code === 'Enter')
        document.activeElement.click();
});

let playFrom = JSON.parse(localStorage.getItem('playFrom')) || {};
let info;
let playlist = [];
let selectedSeria = {};
let animeId = new URLSearchParams(location.search).get('id') || -1;
let animeTitle = '';
playFrom[animeId] = 'undefined' === typeof playFrom[animeId] ? {} : playFrom[animeId];
let seria = playFrom[animeId].seria || 0;

addEventListener('DOMContentLoaded', async () => {
    try {
        let response = await fetch('https://api.animetop.info/v1/info', {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: `id=${animeId}`
        });
        info = await response.json();
        if (info.state.status === 'fail') return;
        animeTitle = info.data[0].title;

        response = await fetch('https://api.animetop.info/v1/playlist', {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: `id=${animeId}`
        });
        playlist = await response.json();
        if (playlist.status === 'fail') return;
        playlist.sort((a, b) => {
            let matchA = a.name.match(/\d+/);
            let matchB = b.name.match(/\d+/);
            return matchA && matchB ? Number(matchA[0]) - Number(matchB[0]) : 1;
        });

        // Populate episode list
        episodeList.innerHTML = '';
        for (let i = 0; i < playlist.length; i++) {
            let episodeItem = document.createElement('div');
            episodeItem.dataset.seria = i;
            episodeItem.classList.add('playlist--seria');
            if (i === seria) {
                episodeItem.classList.add('selected');
            }
            episodeItem.textContent = `Серия ${i + 1}`;
            episodeItem.addEventListener('click', (e) => {
                if (e.which !== 1) return;
                seria = Number(episodeItem.dataset.seria);
                const prevSelected = episodeList.querySelector('.selected');
                if (prevSelected) {
                    prevSelected.classList.remove('selected');
                }
                episodeItem.classList.add('selected');
                episodeList.classList.remove('visible');
                selectSeria();
            });
            episodeList.appendChild(episodeItem);
        }

        // Check for seria parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlSeria = urlParams.get('seria');
        if (urlSeria !== null) {
            seria = parseInt(urlSeria);
        }

        selectSeria();
        const btns = [...document.querySelectorAll('.ui__btn')];

        for (let i = 0; i < btns.length; i++) {
            btns[i].tabIndex = '0';
        }

        video.addEventListener('loadeddata', () => {
            if (playFrom[animeId].seria === seria && playFrom[animeId].time) {
                video.currentTime = playFrom[animeId].time;
            }
        });

        // Fix for video not playing after PiP
        video.addEventListener('enterpictureinpicture', () => {
            if (video.paused) {
                toggleVideo();
            }
        });

        video.addEventListener('leavepictureinpicture', () => {
            if (video.paused) {
                toggleVideo();
            }
        });

    } catch (error) {
        console.error('Error loading anime:', error);
    }
});

function selectSeria() {
    if (selectedSeria !== playlist[seria]) {
        // Update navigation buttons visibility
        backwardBtn.classList.toggle('hidden', seria === 0);
        forwardBtn.classList.toggle('hidden', seria === playlist.length - 1);

        selectedSeria = playlist[seria];
        currentEpisode.textContent = `Серия ${seria + 1}`;
        headTitle.textContent = `${animeTitle} - Серия ${seria + 1}`;

        const wasPlaying = !video.paused;
        const currentTime = video.currentTime;

        video.poster = `https://media.animegost.org/${selectedSeria.preview.slice(25)}`;
        video.src = `https://${selectedSeria.std.replace(/http(s?):\/\//, '')}`;

        if (wasPlaying) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Autoplay prevented:", error);
                });
            }
        }
    }
}

addEventListener('beforeunload', setPlayFrom);
addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        setPlayFrom();
    }
});

function setPlayFrom() {
    if (video.src !== location.href) {
        playFrom[animeId].time = video.currentTime;
        playFrom[animeId].seria = seria;
        localStorage.setItem('playFrom', JSON.stringify(playFrom));
    }
}
