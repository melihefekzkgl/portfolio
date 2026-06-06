import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const btnTr = document.getElementById('btn-tr');
const btnEn = document.getElementById('btn-en');

function changeLanguage(lang) {
    document.querySelectorAll('.lang-text').forEach(el => {
        if(el.getAttribute(`data-${lang}`)) {
            el.textContent = el.getAttribute(`data-${lang}`);
        }
    });

    if (lang === 'tr') {
        if(btnTr) btnTr.classList.add('active');
        if(btnEn) btnEn.classList.remove('active');
    } else {
        if(btnEn) btnEn.classList.add('active');
        if(btnTr) btnTr.classList.remove('active');
    }
}
if (btnTr) btnTr.addEventListener('click', () => changeLanguage('tr'));
if (btnEn) btnEn.addEventListener('click', () => changeLanguage('en'));

const loader = new GLTFLoader();

const container = document.getElementById('three-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
camera.position.set(0, 12, 36); 

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const cameraLight = new THREE.DirectionalLight(0xffffff, 1.2);
cameraLight.position.set(0, 0, 1);
camera.add(cameraLight);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 0);
if (container) container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

let currentModel = null;
function loadModel(url) {
    if (currentModel) scene.remove(currentModel);
    loader.load(url, function (gltf) {
        currentModel = gltf.scene;
        const box = new THREE.Box3().setFromObject(currentModel);
        const center = box.getCenter(new THREE.Vector3());
        currentModel.position.sub(center); 
        scene.add(currentModel);
    }, undefined, function (error) {
        console.error(error);
    });
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

const explodedContainer = document.getElementById('exploded-container');
const explodedScene = new THREE.Scene();
const explodedCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
explodedCamera.position.set(0, 15, 65); 

explodedScene.add(new THREE.AmbientLight(0xffffff, 0.5));
const expLight = new THREE.DirectionalLight(0xffffff, 1);
expLight.position.set(5, 10, 7);
explodedScene.add(expLight);

const explodedRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
explodedRenderer.setPixelRatio(window.devicePixelRatio);
explodedRenderer.setClearColor(0x000000, 0);
if (explodedContainer) explodedContainer.appendChild(explodedRenderer.domElement);

const expControls = new OrbitControls(explodedCamera, explodedRenderer.domElement);
expControls.enableDamping = true;
expControls.target.set(5, 0, 0); 

let explodedModel = null;
let floors = []; 
const floorOriginalPositions = new Map(); 
let targetFloorUuid = 'all'; 

let targetLookAt = new THREE.Vector3(5, 0, 0); 
const colorTarget = new THREE.Color(); 

const floorMenu = document.getElementById('floor-menu');

function loadExplodedModel(url) {
    if (explodedModel) explodedScene.remove(explodedModel);
    floors = [];
    floorOriginalPositions.clear();
    floorMenu.innerHTML = ''; 
    targetFloorUuid = 'all';
    
    const currentLang = (btnEn && btnEn.classList.contains('active')) ? 'en' : 'tr';
    
    loader.load(url, function (gltf) {
        explodedModel = gltf.scene;
        explodedModel.rotation.y = THREE.MathUtils.degToRad(225);
        const box = new THREE.Box3().setFromObject(explodedModel);
        const center = box.getCenter(new THREE.Vector3());
        explodedModel.position.sub(center); 
        explodedModel.position.x -= 5; 
        
        explodedModel.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material.clone(); 
                child.userData.originalColor = child.material.color.clone();
            }
        });

        explodedModel.children.forEach((child) => {
            if (child.type === "Group" || child.type === "Mesh") {
                floors.push(child);
                floorOriginalPositions.set(child.uuid, child.position.clone());
            }
        });

        const allBtn = document.createElement('button');
        allBtn.className = 'floor-btn active lang-text';
        allBtn.setAttribute('data-tr', 'Tüm Bina');
        allBtn.setAttribute('data-en', 'Whole Building');
        allBtn.textContent = allBtn.getAttribute(`data-${currentLang}`);
        allBtn.onclick = () => selectFloor('all', allBtn);
        floorMenu.appendChild(allBtn);

        floors.forEach((floor, index) => {
            const btn = document.createElement('button');
            btn.className = 'floor-btn lang-text';
            if (index === 0) {
                btn.setAttribute('data-tr', 'Zemin Kat');
                btn.setAttribute('data-en', 'Ground Floor');
            } else {
                btn.setAttribute('data-tr', `${index}. Kat`);
                btn.setAttribute('data-en', `Floor ${index}`);
            }
            btn.textContent = btn.getAttribute(`data-${currentLang}`);
            btn.onclick = () => selectFloor(floor.uuid, btn);
            floorMenu.appendChild(btn);
        });

        explodedScene.add(explodedModel);
    }, undefined, function (error) {
        console.error(error);
    });
}

function selectFloor(uuid, clickedBtn) {
    targetFloorUuid = uuid;
    const btns = floorMenu.querySelectorAll('.floor-btn');
    btns.forEach(b => b.classList.remove('active'));
    clickedBtn.classList.add('active');
}

function animateExploded() {
    requestAnimationFrame(animateExploded);
    if (targetFloorUuid === 'all') {
        targetLookAt.set(5, 0, 0); 
    } else {
        const activeFloor = floors.find(f => f.uuid === targetFloorUuid);
        if (activeFloor) {
            const box = new THREE.Box3().setFromObject(activeFloor);
            box.getCenter(targetLookAt); 
        }
    }
    expControls.target.lerp(targetLookAt, 0.05);
    expControls.update();
    
    if (floors.length > 0) {
        floors.forEach(floor => {
            const originalPos = floorOriginalPositions.get(floor.uuid);
            const isSelected = (targetFloorUuid === 'all' || floor.uuid === targetFloorUuid);
            const targetX = (targetFloorUuid === 'all') 
                            ? originalPos.x 
                            : (isSelected ? originalPos.x + 25 : originalPos.x);
            floor.position.x += (targetX - floor.position.x) * 0.05;
            floor.traverse((child) => {
                if (child.isMesh && child.userData.originalColor) {
                    colorTarget.copy(child.userData.originalColor);
                    if (!isSelected) colorTarget.multiplyScalar(0.15); 
                    child.material.color.lerp(colorTarget, 0.05);
                }
            });
        });
    }
    explodedRenderer.render(explodedScene, explodedCamera);
}
animateExploded();

const modelModal = document.getElementById("model-modal");
const gameModal = document.getElementById("game-modal");
const explodedModal = document.getElementById("exploded-modal");
const cardGame = document.getElementById("card-game"); 
const cards3d = document.querySelectorAll(".card-3d");
const cardExploded = document.getElementById("card-exploded"); 
const closeModelBtn = document.getElementById("close-model");
const closeGameBtn = document.getElementById("close-game");
const closeExplodedBtn = document.getElementById("close-exploded");

function resizeCanvas() {
    if (container) {
        renderer.setSize(container.clientWidth, container.clientHeight);
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
    }
    if (explodedContainer) {
        explodedRenderer.setSize(explodedContainer.clientWidth, explodedContainer.clientHeight);
        explodedCamera.aspect = explodedContainer.clientWidth / explodedContainer.clientHeight;
        explodedCamera.updateProjectionMatrix();
    }
}

const modelBtns = document.querySelectorAll('.model-btn');
modelBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        modelBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        loadModel(e.target.getAttribute('data-src'));
    });
});

if (cards3d.length > 0) {
    cards3d.forEach(card => {
        card.addEventListener("click", () => {
            const modelUrl = card.getAttribute("data-src");
            if (modelModal && modelUrl) {
                modelModal.style.display = "block";
                modelBtns.forEach(b => b.classList.remove('active'));
                if(modelBtns.length > 0) modelBtns[0].classList.add('active');
                loadModel(modelUrl);
                setTimeout(resizeCanvas, 50); 
            }
        });
    });
}

if (cardExploded && explodedModal) {
    cardExploded.addEventListener("click", () => {
        explodedModal.style.display = "block";
        loadExplodedModel('assets/bina_katmanli.glb');
        setTimeout(resizeCanvas, 50);
    });
}

if (cardGame && gameModal) {
    cardGame.addEventListener("click", () => {
        gameModal.style.display = "block";
    });
}

if (closeModelBtn) closeModelBtn.addEventListener("click", () => modelModal.style.display = "none");
if (closeGameBtn) closeGameBtn.addEventListener("click", () => gameModal.style.display = "none");
if (closeExplodedBtn) closeExplodedBtn.addEventListener("click", () => explodedModal.style.display = "none");

const galleryModal = document.getElementById("gallery-modal");
const closeGalleryBtn = document.getElementById("close-gallery");
const galleryImage = document.getElementById("gallery-image");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const galleryCounter = document.getElementById("gallery-counter");
const cardGraphic = document.getElementById("card-graphic");
const cardPrint = document.getElementById("card-print");

const graphicImages = ['assets/graphic1.png','assets/graphic2.png','assets/graphic3.png','assets/graphic4.png','assets/graphic5.png','assets/graphic6.png','assets/graphic7.png','assets/graphic8.png'];
const printImages = ['assets/printed1.png','assets/printed2.png','assets/printed3.png'];

let currentGallery = [];
let currentIndex = 0;

function openGallery(images) {
    if (images.length === 0) return;
    currentGallery = images;
    currentIndex = 0;
    updateGalleryUI();
    galleryModal.style.display = "block";
}

function updateGalleryUI() {
    galleryImage.src = currentGallery[currentIndex];
    galleryCounter.textContent = `${currentIndex + 1} / ${currentGallery.length}`;
}

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex > 0) ? currentIndex - 1 : currentGallery.length - 1;
        updateGalleryUI();
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex < currentGallery.length - 1) ? currentIndex + 1 : 0;
        updateGalleryUI();
    });
}

if (cardGraphic) cardGraphic.addEventListener("click", () => openGallery(graphicImages));
if (cardPrint) cardPrint.addEventListener("click", () => openGallery(printImages));
if (closeGalleryBtn) closeGalleryBtn.addEventListener("click", () => galleryModal.style.display = "none");

window.addEventListener("click", (event) => {
    if (modelModal && event.target === modelModal) modelModal.style.display = "none";
    if (gameModal && event.target === gameModal) gameModal.style.display = "none";
    if (explodedModal && event.target === explodedModal) explodedModal.style.display = "none";
    if (galleryModal && event.target === galleryModal) galleryModal.style.display = "none"; 
});

window.addEventListener('resize', () => {
    if (modelModal.style.display === "block" || explodedModal.style.display === "block") {
        resizeCanvas();
    }
});