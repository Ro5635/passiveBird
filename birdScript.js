"use strict";
/**
 * Passive Game
 *
 * A bird fly round collecting sprite cans, the more caught the more points earned!
 * No user input required!
 *
 * This is a first attempt at coding in a more functional style, there is a fair amount of state implicit in most
 * of these functions and not so manny of them ae pure.
 *
 * app.stage.addChild(PIXI.Sprite.from('something.png'));
 *
 */

///////// Configure PixiJS
let type = "WebGL";
if (!PIXI.utils.isWebGLSupported()) {
    type = "canvas"
}

let app = new PIXI.Application();

app.renderer.view.style.position = "absolute";
app.renderer.view.style.display = "block";
app.renderer.autoResize = true;
app.renderer.resize(window.innerWidth, window.innerHeight);

//Add the Pixi canvas to the HTML document
document.body.appendChild(app.view);
//////////////////


const directionsEnum = Object.freeze({"NORTH": 1, "EAST": 2, "SOUTH": 3, "WEST": 4});

let birds = [{
    "name": "Jeff",
    "images": {
        "default": "assets/aBirdLeft.png",
        "leftwards": "assets/aBirdLeft.png",
        "rightwards": "assets/aBirdRight.png"
    },
    "vy": 0,
    "vx": 0
}];

let userSprite = {
    "name": "User",
    "images": {"default": "assets/sprite.png", "leftwards": "assets/sprite.png", "rightwards": "assets/sprite.png"},
    "vy": 0,
    "vx": 0
};

// Users scored points within the game session
let points = 0;


//////////////////
/// Utility Functions Follow
//////////////////


/**
 * cacheTextures
 *
 * Caches each of the passed images into the renderer's cache, returns a promise which resolves when all of the
 * passed images have been loaded into the cache.
 *
 * @param images    String Array of image resource paths example: ['images/face.png', 'images/cake.png']
 * @return {Promise<any> | Promise}
 */
function cacheTextures(images) {
    return new Promise((resolve, reject) => {

        // filter out any images that are already cached
        let filteredImages = images.filter(image => {
            return PIXI.loader.resources[image] === undefined;

        });

        // Remove duplicates
        const imagesForCaching = new Set(filteredImages);

        PIXI.loader
            .add([...imagesForCaching])
            .load(() => {
                return resolve();

            });
    });
}


/**
 * setSpriteTexture
 *
 * @param sprite PixiJS Sprite
 * @param cachedTextureKey  String Key to reference a previously cached texture
 */
function setSpriteTexture(sprite, cachedTextureKey) {
    // Only update texture if supplied texture is not already loaded
    if (sprite.texture !== PIXI.loader.resources[cachedTextureKey].texture) {
        sprite.texture = PIXI.loader.resources[cachedTextureKey].texture;
    }

}


/**
 * getSprite
 *
 * Gets a PixiJS Sprite using the provided cachedTexture key
 * The provided texture key must already have been loaded into
 * the texture cache
 *
 * @param cachedTexture String Key referencing a existing texture in the renderer cache
 * @return {Sprite} PixiJS Sprite
 */
function getSprite(cachedTexture) {
    return new PIXI.Sprite(
        PIXI.loader.resources[cachedTexture].texture
    );
}


/**
 * stageSprite
 *
 * Adds the passed PixiJS Sprite to the stage
 *
 * @param sprite  PixiJS Sprite
 * @return PixiJS Sprite, returns the passed sprite
 */
function stageSprite(sprite) {
    //Add the bird to the stage
    app.stage.addChild(sprite);

    return sprite;

}


/**
 * createSprite
 *
 * Creates a PixiJS Sprite from the default image provided on a JSON Object of images
 * handles caching the images and creating the sprites and returns a promise that will resolve with
 * the requested sprite
 *
 * @param images JSON Object example: {'default': 'cola.png', left: 'cake.png'}
 * @return {Promise<any> | Promise}
 */
function createSprite(images) {
    return new Promise(async function (resolve, reject) {
        await cacheTextures(Object.values(images));

        return resolve(getSprite(images.default));

    });

}


/**
 * getRandCord
 *
 * TODO: TO make this a pure function the stage should be passed in
 *
 * Gets a Random coordinate within the stage
 *
 * Returns: {x: 44, y: 77}
 **/
function getRandCord() {
    const maxX = app.screen.width;
    const maxY = app.screen.height;

    const randX = Math.floor(Math.random() * maxX) + 1;
    const randY = Math.floor(Math.random() * maxY) + 1;

    return {x: randX, y: randY};

}


/**
 * placeSprite
 * Update passed sprites position to the passed position coordinates
 *
 * @param position
 * @param sprite  PixiJS Sprite
 */
function placeSprite(position, sprite) {
    sprite.x = position.x;
    sprite.y = position.y;
}


/**
 * placeToRandPos
 *
 * Places the passed sprite to a random position on the stage
 * @param sprite
 */
const placeToRandPos = sprite => placeSprite(getRandCord(), sprite);


/**
 * createSpritesOnStage
 *
 * Creates a sprite on the stage from a character definition, returned promise resolves when
 * each of the passed characters has been created
 *
 * @param characters example: [{
 *   "name": "Jeff",
 *   "images": {
 *       "default": "assets/aBirdLeft.png",
 *       "leftwards": "assets/aBirdLeft.png",
 *       "rightwards": "assets/aBirdRight.png"
 *   },
 *   "vy": 0,
 *   "vx": 0
 * }]
 *
 * @return {Promise<*>}
 */
const createSpritesOnStage = async characters => {

    // Use reduce to enforce sequential promise resolution
    return characters.reduce(async (previousPromise, character) => {
        await previousPromise;

        return new Promise(async (resolve, reject) => {

            console.log(`Starting load of ${character.name}`);
            character.sprite = await createSprite(character.images);
            console.log(`Finished loading ${character.name}`);

            stageSprite(character.sprite);

            placeToRandPos(character.sprite);

            return resolve();

        });
    }, Promise.resolve());

};


function incValue(value, incrementValue = 1) {
    value = value + incrementValue;
    return value;
}


/**
 * updatePointsDisplay
 *
 * Update the points read out in the DOM
 */
function updatePointsDisplay(points) {
    const scoreReadOutElement = document.getElementById("scoreReadOut");
    scoreReadOutElement.innerText = points;

}

function scorePoints(currentPoints, scoredPoints) {
    const points = incValue(currentPoints, scoredPoints);
    updatePointsDisplay(points);

    return points;

}


/**
 * hasPassedEdge
 *
 * A collection of functions to check to see if a sprite has passed the selected edge
 *
 * @param PixiJS Sprite
 * @returns Boolean true if sprite has passed the indicated edge
 */
const hasPassedEdge = {
    north: (sprite) => {
        return sprite.y < 0;
    },
    east: (sprite) => {
        return sprite.x > window.innerWidth - sprite.width;
    },
    south: (sprite) => {
        return sprite.y > window.innerHeight - sprite.height;
    },
    west: (sprite) => {
        return sprite.x < 0;
    }
};

/**
 * setBirdTextureDirection
 *
 * Set the texture on the bird based upon the passed direction
 * @param birdDirection directionsEnum to represents a compass direction
 * @param bird A Bird JSON Object eg: {"name": "Ted", "images": {"default": "def.png", "leftwards": "left.png", "rightwards": "right.png"}, "vy": 0, "vx": 0}
 */
function setBirdTextureDirection(birdDirection, bird) {
    switch (birdDirection) {

        case directionsEnum.EAST:
            setSpriteTexture(bird.sprite, bird.images.rightwards);

            break;

        case directionsEnum.WEST:
            setSpriteTexture(bird.sprite, bird.images.leftwards);

            break;

        default:
            console.log('Texture direction could not be set');

            break;
    }

}


/**
 * hitTestRectangle
 *
 * Function copied from provided PixiJS docs
 *
 * @param r1    PixiJS Staged Object
 * @param r2    PixiJS Staged Object
 * @return {boolean}    True if the passed rectangles have intersected
 */
function hitTestRectangle(r1, r2) {

    //Define the variables needed to calculate
    let hit, combinedHalfWidths, combinedHalfHeights, vx, vy;

    //hit will determine whether there's a collision
    hit = false;

    //Get center points of each sprite
    r1.centerX = r1.x + r1.width / 2;
    r1.centerY = r1.y + r1.height / 2;
    r2.centerX = r2.x + r2.width / 2;
    r2.centerY = r2.y + r2.height / 2;

    //Get half-widths and half-heights for each sprite
    r1.halfWidth = r1.width / 2;
    r1.halfHeight = r1.height / 2;
    r2.halfWidth = r2.width / 2;
    r2.halfHeight = r2.height / 2;

    //Calculate the distance vector between the sprites
    vx = r1.centerX - r2.centerX;
    vy = r1.centerY - r2.centerY;

    //Figure out the combined half-widths and half-heights
    combinedHalfWidths = r1.halfWidth + r2.halfWidth;
    combinedHalfHeights = r1.halfHeight + r2.halfHeight;

    //Check for a collision on the x axis
    if (Math.abs(vx) < combinedHalfWidths) {

        //A collision might be occurring. Check for a collision on the y axis
        hit = Math.abs(vy) < combinedHalfHeights;
    } else {

        //There's no collision on the x axis
        hit = false;
    }

    //`hit` will be either `true` or `false`
    return hit;
}

///////////////////////////////////
////// 'Game'
///////////////////////////////////

runnable();

/**
 * runnable
 *
 * Creates the game spites on the stage and give them an initial velocity
 * then calls the game loop.
 */
async function runnable() {

    await createSpritesOnStage([userSprite, ...birds]);

    // Set initial velocity
    birds[0].sprite.vx = -4.8;
    birds[0].sprite.vy = 1;

    gameLoop();

}

/**
 * gameLoop
 *
 * Handles frame by frame progression to be called on each frame
 *
 * @param delta
 */
function gameLoop(delta) {

    if (hasPassedEdge.east(birds[0].sprite)) {
        setBirdTextureDirection(directionsEnum.WEST, birds[0]);
        birds[0].sprite.vx = -4.8;
    }

    if (hasPassedEdge.west(birds[0].sprite)) {
        setBirdTextureDirection(directionsEnum.EAST, birds[0]);
        birds[0].sprite.vx = 4.8;
    }

    if (hasPassedEdge.south(birds[0].sprite)) {
        birds[0].sprite.vy = -1;
    }

    if (hasPassedEdge.north(birds[0].sprite)) {
        birds[0].sprite.vy = 1;
    }


    // Check for collision
    if (hitTestRectangle(birds[0].sprite, userSprite.sprite)) {
        placeToRandPos(userSprite.sprite);
        points = scorePoints(points, 1);

    }


    //Apply the velocity values to the sprite's
    //position to make it move
    birds[0].sprite.x += birds[0].sprite.vx;
    birds[0].sprite.y += birds[0].sprite.vy;


    //Call this `gameLoop` function on the next screen refresh
    //(which happens 60 times per second)
    requestAnimationFrame(gameLoop);
}
