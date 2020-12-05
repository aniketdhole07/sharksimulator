var world;
var yoff = 0.0;
var bloops = [];
var ghosts = [];
var sharks = [];
var flock; var img;
var foodChance = 0.03;
var mutationRate = 0.05;
var numSharks = 2;

// Gradient Constants
var c1, c2;

$('.btn-primary').on('click', function() {
  $('.info-options').toggle();
});

$('#food-chance').on("change", function() {
  foodChance = $('#food-chance').val();
});

$('#mutation').on("change", function() {
  mutationRate = $('#mutation').val();
});

$('#sharks').on("change", function() {
  numSharks = $('#sharks').val();
});

$('.btn-danger').on('click', function() {
  if (bloops.length > 0) {
    for (var b = 0; b < bloops.length; b++) {
      bloops[b].health = -1;
    }
  }
});

function setup() {
  var cHeight = window.innerHeight;
  if (cHeight < 600) {
    cHeight = 600;
  }
  createCanvas(window.innerWidth, cHeight);

  c1 = color(255);
  c2 = color(176,196,222);

  flock = new Flock();
  // Add an initial set of boids into the system
  for (var i = 0; i < 30; i++) {
    var b = new Boid(random(0, width/2),random(0, height/2));
    flock.addBoid(b);
  }
  flock2 = new Flock();
  for (var j = 0; j < 30; j++) {
    var b = new Boid(random(width/2, width),random(height/2, height));
    flock2.addBoid(b);
  }
  // constructTrees();
  // World starts with 15 creatures
  // and 20 food fish
  world = new World(15);
  for (var sh = 0; sh < 3; sh++) {
    sharks.push(new Shark());
  }
  // Set in motion before drawing
  for (var h = 0; h < 100; h++) {
    world.preRun();
  }
}

function draw() {
  setGradient(0, 0, width, height, c1, c2);

  world.run();
}

function setGradient(x, y, w, h, c1, c2) {
  noFill();
  for (var i = y; i <= y+h; i++) {
    var inter = map(i, y, y+h, 0, 1);
    var c = lerpColor(c1, c2, inter);
    stroke(c);
    line(x, i, x+w, i);
  }
}

function mousePressed() {
  if ($('.info-options').css('display') === 'none' || mouseX > 300) {
    world.born(mouseX,mouseY);
  }
}

function mouseDragged() {
  if ($('.info-options').css('display') === 'none' || mouseX > 200) {
    world.born(mouseX,mouseY);
  }
}

// Constructor
function World(num) {
  // Start with initial food and creatures
  this.food = new Food(num);
  bloops = [];        // An array for all creatures
  for (var i = 0; i < num; i++) {
    var l = createVector(random(width), random(height));
    var dna = new DNA();
    bloops.push(new Bloop(l, dna));
  }

  // Make a new creature
  this.born = function(x, y) {
    var l = createVector(x, y);
    var dna = new DNA();
    bloops.push(new Bloop(l, dna));
  }

  this.preRun = function() {
    for (var s = 0; s < sharks.length; s++) {
      sharks[s].run();
    }
  }

  // Run the world
  this.run = function() {
    flock.run();
    flock2.run();
    // Deal with food
    this.food.run();

    for (var g = ghosts.length - 1; g >= 0; g--) {
      if (ghosts[g].dead()) {
        ghosts.splice(g, 1);
      } else {
        ghosts[g].update();
        ghosts[g].display();
      }
    }

    for (var s = 0; s < numSharks; s++) {
      sharks[s].run();
      sharks[s].eat();
    }

    // Cycle through the ArrayList backwards b/c we are deleting
    for (var i = bloops.length-1; i >= 0; i--) {
      // All bloops run and eat
      var b = bloops[i];
      b.run();
      b.eat(this.food);
      b.seek(this.food);
      for (var sh = 0; sh < sharks.length; sh++) {
        b.runAway(sharks[sh]);
      }
      b.separate();
      // If it's dead, kill it and make food
      if (b.dead()) {
        bloops.splice(i, 1);
        if (foodChance != 0) {
          this.food.add(b.position);
        }
        ghosts.push(new Ghost(b.position, b.velocity, b.r));
      }
      // Perhaps this bloop would like to make a baby?
      var child = b.reproduce();
      if (child != null) bloops.push(child);
    }
  }
}

function Food(num) {
  // Start with some food
  this.food = [];
  for (var i = 0; i < num; i++) {
    var position = createVector(random(width),random(height));
    this.food.push(new fishFood(position));
  }

  // Add some food at a location
  this.add = function(l) {
    var position = l.copy();
    this.food.push(new fishFood(position));
  }

  // Display the food
  this.run = function() {
    for (var i = 0; i < this.food.length; i++) {
      var f = this.food[i];
      f.update();
      f.checkEdges();
      push();
  		noStroke();
  		fill(255, 127, 127);
  		translate(f.position.x, f.position.y);
  		rotate(HALF_PI + atan2(f.velocity.y, f.velocity.x));
  		beginShape();
  		curveVertex(0, -0.5 * 12);
  		curveVertex(0.2 * 12, 0);
  		curveVertex(0, 1.5 * 12);
  		curveVertex(-0.2 * 12, 0);
  		curveVertex(0, -0.5 * 12);
  		curveVertex(0.2 * 12, 0);
  		curveVertex(0, 1.5 * 12);
  		endShape();
  		pop();
      // noStroke();
      // fill(255, 127, 127);
      // ellipse(f.position.x, f.position.y, 8, 8);
    }

    // There's a small chance food will appear randomly
    if (random(1) < foodChance) {
      var position = createVector(random(width),random(height));
      this.food.push(new fishFood(position));
    }
  }

  // Return the list of food
  this.getFood = function() {
    return this.food;
  }
}

function fishFood(position) {
  this.position = position;
  this.velocity = createVector();
  this.acceleration = createVector();
  this.noff = createVector(random(1000),random(1000));
  this.topspeed = 3;

  this.update = function() {
    this.acceleration.x = map(noise(this.noff.x), 0, 1, -1, 1);
    this.acceleration.y = map(noise(this.noff.y), 0, 1, -0.2, 0.25);
    this.noff.add(0.01,0.01,0);
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.topspeed);
    this.position.add(this.velocity);
  }

  this.checkEdges = function() {
    if (this.position.x > width + 100) {
      this.position.x = width;
      this.velocity.x *= -1;
    } else if (this.position.x < -100) {
      this.velocity.x *= -1;
      this.position.x = 0;
    }
    if (this.position.y > height + 100) {
      this.velocity.y *= -1;
      this.position.y = height;
    } else if (this.position.y < -100) {
      this.velocity.y *= -1;
      this.position.y = 0;
    }
  };
}

// Constructor (makes a random DNA)
function DNA(newgenes) {
  if (newgenes) {
    this.genes = newgenes;
  } else {
    // The genetic sequence
    this.genes = new Array(1);
    for (var i = 0; i < this.genes.length; i++) {
      this.genes[i] = random(90,230);
    }
  }

  this.copy = function() {
    // should switch to fancy JS array copy
    var newgenes = [];
    for (var i = 0; i < this.genes.length; i++) {
      newgenes[i] = this.genes[i];
    }

    return new DNA(newgenes);
  }

  // Based on a mutation probability, picks a new random character in array spots
  this.mutate = function(m) {
    for (var i = 0; i < this.genes.length; i++) {
      if (random(1) < m) {
         this.genes[i] = random(90,230);
      }
    }
  }
}

// Create a "bloop" creature
function Bloop(l, dna_) {
  this.position = l.copy();  // Location
  this.health = 200;  // Life timer
  this.xoff = random(1000);  // For perlin noise
  this.yoff = random(1000);
  this.dna = dna_;   // DNA
  // DNA will determine color and maxspeed
  // The lighter the bloop, the slower it is
  this.maxspeed = map(this.dna.genes[0], 90, 230, 4, 0.75);
  this.maxforce = map(this.dna.genes[0], 90, 230, 0.40, 0.075);
  this.r = random(12, 30);
  this.acceleration = createVector(0, 0);
  this.velocity = createVector(random(-1, 1), random(-1, 1));
  this.fill = this.dna.genes[0];
  this.sightRadius = map(this.dna.genes[0], 90, 230, 500, 200);
  if (random(1) < 0.25) {
    this.secondarySexChar = true;
  } else {
    this.secondarySexChar = false;
  }

  this.run = function() {
    this.update();
    this.borders();
    this.display();
  }

  // A bloop can find food and eat it
  this.eat = function(f) {
    var food = f.getFood();
    // Are we touching any food objects?
    for (var i = food.length-1; i >= 0; i--) {
      var foodLocation = food[i].position;
      var d = p5.Vector.dist(this.position, foodLocation);
      // If we are, juice up our strength!
      if (d < this.r/2) {
        this.health += 100;
        food.splice(i,1);
      }
    }
  }

  // At any moment there is a tiny chance a bloop will reproduce
  this.reproduce = function() {
    // asexual reproduction
    var reproductionChance = 0.0003;
    // Green markings on a fish's back give the fish a four times higher chance of reproducing at any given moment
    if (this.secondarySexChar) {
      reproductionChance = 0.0012;
    }
    // can only have children once they have grown
    if (this.r > 29 && random(1) < reproductionChance) {
      // Child is exact copy of single parent
      var childDNA = this.dna.copy();
      // Child DNA can mutate
      childDNA.mutate(mutationRate);
      var child = new Bloop(this.position, childDNA);
      child.r = 12;
      // 90% chance the child will inherit the green stars on its back if its parent has them
      if (this.secondarySexChar && random(1) < 1 - mutationRate) {
        child.secondarySexChar = true;
      }
      return child;
    }
    else {
      return null;
    }
  }

  this.withinSight = function(target) {
    // var heading = this.velocity;
    // var angleBetween = p5.Vector.angleBetween(heading, target);
    var targetVec = p5.Vector.sub(target,this.position);
    if (targetVec.mag() < this.sightRadius/2) {
      return true;
    } else {
      return false;
    }
  };

  this.seek = function(f, s) {
    var food = f.getFood();
    var closest;
    var closestDist = Number.MAX_SAFE_INTEGER;
    for (var i = 0; i < food.length; i++) {
      var target = food[i].position;
      if (this.withinSight(target)) {

        var desired = p5.Vector.sub(target,this.position);  // A vector pointing from the location to the target

        var desiredDist = desired.mag();

        if (desiredDist < closestDist) {
          closest = desired;
          closestDist = desiredDist;
        }
      }
    }

    if (closest) {
      // Scale to maximum speed
      closest.setMag(this.maxspeed);

      // Steering = Desired minus velocity
      var steer = p5.Vector.sub(closest,this.velocity);
      steer.limit(this.maxforce);  // Limit to maximum steering force

      this.applyForce(steer);
    }
  };

  this.runAway = function(shark) {
    var target = shark.position;
    if (this.withinSight(target)) {
      var desired = p5.Vector.sub(target,this.position);  // A vector pointing from the location to the target

      // Scale to maximum speed
      desired.setMag(this.maxspeed);

      // Steering = Desired minus velocity
      var steer = p5.Vector.sub(desired,this.velocity);
      steer.limit(this.maxforce);  // Limit to maximum steering force

      this.applyForce(steer.mult(-2));
    }
  }

  this.applyForce = function(force) {
    // We could add mass here if we want A = F / M
    this.acceleration.add(force);
  };

  // Method to update position
  this.update = function() {
    // Simple movement based on perlin noise
    this.velocity.add(this.acceleration);
    // Limit speed
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    // Reset accelerationelertion to 0 each cycle
    this.acceleration.mult(0);
    this.acceleration.x = map(noise(this.xoff), 0, 1, -0.05, 0.05);
    this.acceleration.y = map(noise(this.yoff), 0, 1, -0.05, 0.05);
    this.xoff += 0.01;
    this.yoff += 0.01;

    if (this.r < 30) {
      this.r += 0.05;
    }

    // this.position.add(this.velocity);
    // Death always looming
    this.health -= 0.33;
  }


  this.borders = function() {

    var desired = null;

    if (this.position.x < 200) {
      desired = createVector(this.maxspeed, this.velocity.y);
    }
    else if (this.position.x > width - 100) {
      desired = createVector(-this.maxspeed, this.velocity.y);
    }

    if (this.position.y < 100) {
      desired = createVector(this.velocity.x, this.maxspeed);
    }
    else if (this.position.y > height - 100) {
      desired = createVector(this.velocity.x, -this.maxspeed);
    }

    if (desired !== null) {
      desired.normalize();
      desired.mult(this.maxspeed);
      var steer = p5.Vector.sub(desired, this.velocity);
      steer.limit(this.maxforce);
      this.applyForce(steer);
    }
  };

  // Method to display
  this.display = function() {
    var angle = this.velocity.heading();
    var offset = random(1000);
    var finNoise = map(noise(offset), 0, 1, -this.r/4, this.r/4);
    offset += 0.01;
    noStroke();
    fill(this.fill);
    rectMode(CENTER);
    push();
    translate(this.position.x, this.position.y);
    rotate(angle);
    rect(0, 0, (7 * this.r)/8, (7 * this.r)/8, 20, 20, 20, 20);
    rect(-this.r/3, -this.r/3, this.r/7, this.r/7);
    rect(-this.r/3, this.r/3, this.r/7, this.r/7);
    triangle(0, this.r/2, 0, -this.r/2, -this.r, finNoise)
    fill(255);
    ellipse(this.r/5, -this.r/5, 8, 8);
    ellipse(this.r/5, this.r/5, 8, 8);
    fill(98);
    ellipse(this.r/5, -this.r/5, 4, 4);
    ellipse(this.r/5, this.r/5, 4, 4);
    if (this.secondarySexChar) {
      fill(213, 255, 156);
      textSize(this.r/2);
      text("***", -this.r/2, (7 * this.r)/24);
    }
    fill(this.fill);
    triangle(-this.r/2,0,-this.r - finNoise,-finNoise * 2,-this.r - finNoise,finNoise * 2)
    pop();
  }

  this.separate = function() {
    var desiredseparation = 100.0;
    var steer = createVector(0,0);
    var count = 0;
    // For every boid in the system, check if it's too close
    for (var i = 0; i < bloops.length; i++) {
      var d = p5.Vector.dist(this.position,bloops[i].position);
      // If the distance is greater than 0 and less than an arbitrary amount (0 when you are yourself)
      if ((d > 0) && (d < desiredseparation)) {
        // Calculate vector pointing away from neighbor
        var diff = p5.Vector.sub(this.position,bloops[i].position);
        diff.normalize();
        diff.div(d);        // Weight by distance
        steer.add(diff);
        count++;            // Keep track of how many
      }
    }
    // Average -- divide by how many
    if (count > 0) {
      steer.div(count);
    }

    // As long as the vector is greater than 0
    if (steer.mag() > 0) {
      // Implement Reynolds: Steering = Desired - Velocity
      steer.normalize();
      steer.mult(this.maxspeed);
      steer.sub(this.velocity);
      steer.limit(this.maxforce);
    }
    this.applyForce(steer);
  };

  // Death
  this.dead = function() {
    if (this.health < 0.0) {
      return true;
    }
    else {
      return false;
    }
  }
}

function Ghost(p, v, r, f) {
  this.position = p;
  this.velocity = v;
  this.r = r;
  this.lifespan = 555;

  this.update = function() {
    this.position.add(this.velocity);
    this.lifespan -= 5;
  }

  this.dead = function() {
    if (this.lifespan < 0) {
      return true;
    } else {
      return false;
    }
  }

  this.display = function() {
    var angle = this.velocity.heading();
    noStroke();
    fill(255, 255, 255, this.lifespan);
    rectMode(CENTER);
    push();
    translate(this.position.x, this.position.y);
    rotate(angle);
    rect(0, 0, this.r, this.r, 20, 20, 20, 20);
    triangle(0, this.r/2, 0, -this.r/2, -this.r, 0);
    fill(255, 255, 255, this.lifespan);
    fill(98, 98, 98, this.lifespan);
    textSize(this.r/3);
    text("x", this.r/6, -this.r/8);
    text("x", this.r/6, this.r/3);
    fill(255, 255, 255, this.lifespan);
    triangle(-this.r/2,0,-this.r,0,-this.r,0);
    pop();
  }
}

function Shark() {
  this.position = createVector(random(width + 100, width + 300), random(height));
  this.velocity = createVector();
  this.acceleration = createVector();
  this.xoff = random(1000);
  this.yoff = random(1000);
  this.maxspeed = 2;
  this.maxforce = 0.08;
  this.r = 100;
  this.sightRadius = 500;
  this.history = [];
  this.eatingVal = 0;

  this.run = function() {
    this.update();
    this.borders();
    this.seek();
    this.separate();
    this.display();
  }

  this.applyForce = function(force) {
    // We could add mass here if we want A = F / M
    this.acceleration.add(force);
  };

  this.seek = function() {
    var closest;
    var closestDist = Number.MAX_SAFE_INTEGER;
    for (var i = 0; i < bloops.length; i++) {
      var target = bloops[i].position;
      var desired = p5.Vector.sub(target,this.position);  // A vector pointing from the location to the target
      var desiredDistance = desired.mag();
      if (desiredDistance < closestDist) {
        closest = desired;
        closestDist = desiredDistance;
      }
    }

    if (typeof closest != "undefined") {
      this.targetBloop = closest;
      closest.setMag(this.maxspeed);
      var steer = p5.Vector.sub(closest,this.velocity);
      steer.limit(this.maxforce);  // Limit to maximum steering force
      this.applyForce(steer);
    }
  };

  function samePosition(p1, p2) {
    if (p1.x === p2.x && p1.y === p2.y) {
      return true;
    } else {
      return false;
    }
  }

  this.separate = function() {
    var desiredseparation = 200.0;
    var steer = createVector(0,0);
    var count = 0;
    // For every shark in the system, check if it's too close
    for (var i = 0; i < sharks.length; i++) {
      var d = p5.Vector.dist(this.position,sharks[i].position);
      // If the distance is greater than 0 and less than an arbitrary amount (0 when you are yourself)
      if ((d > 0) && (d < desiredseparation)) {
        // Calculate vector pointing away from neighbor
        var diff = p5.Vector.sub(this.position,sharks[i].position);
        diff.normalize();
        diff.div(d);        // Weight by distance
        steer.add(diff);
        count++;            // Keep track of how many
      }
    }
    // Average -- divide by how many
    if (count > 0) {
      steer.div(count);
    }

    // As long as the vector is greater than 0
    if (steer.mag() > 0) {
      // Implement Reynolds: Steering = Desired - Velocity
      steer.normalize();
      steer.mult(this.maxspeed);
      steer.sub(this.velocity);
      steer.limit(this.maxforce * 1.1);
    }
    this.applyForce(steer);
  };

  // Method to update position
  this.update = function() {
    // Simple movement based on perlin noise
    this.velocity.add(this.acceleration);
    // Limit speed
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    // Reset accelerationelertion to 0 each cycle
    this.acceleration.mult(0);
    this.acceleration.x = map(noise(this.xoff), 0, 1, -0.05, 0.05);
    this.acceleration.y = map(noise(this.yoff), 0, 1, -0.01, 0.01);
    this.xoff += 0.01;
    this.yoff += 0.01;

    if (this.eatingVal > 0) {
      this.eatingVal -= 1;
    }

    var v = createVector(this.position.x, this.position.y);
    this.history.push(v);
    if (this.history.length > 100) {
      this.history.splice(0, 1);
    }
  }

  this.borders = function() {
    var desired = null;

    if (this.position.x < 200) {
      desired = createVector(this.maxspeed, this.velocity.y);
    }
    else if (this.position.x > width - 100) {
      desired = createVector(-this.maxspeed, this.velocity.y);
    }

    if (this.position.y < 100) {
      desired = createVector(this.velocity.x, this.maxspeed);
    }
    else if (this.position.y > height - 100) {
      desired = createVector(this.velocity.x, -this.maxspeed);
    }

    if (desired !== null) {
      desired.normalize();
      desired.mult(this.maxspeed);
      var steer = p5.Vector.sub(desired, this.velocity);
      steer.limit(this.maxforce);
      this.applyForce(steer);
    }
  };

  this.eat = function() {
    // Are we touching any food objects?
    for (var i = bloops.length - 1; i >= 0; i--) {
      var bloopLocation = bloops[i].position;
      var d = p5.Vector.dist(this.position, bloopLocation);
      if (d < this.r/2) {
        this.eatingVal = 20;
        bloops[i].health = -1;
      }
    }
  }

  this.display = function() {
    var angle = this.velocity.heading();
    noStroke();
    fill(56, 78, 89, 155);
    rectMode(CENTER);
    push();
    translate(this.position.x, this.position.y);
    rotate(angle);
    // translate(this.position.x, this.position.)
    // rotate(angle);
    ellipse(this.eatingVal, 0, this.r, this.r);
    pop();
    // noFill();
    // beginShape();
    fill(56, 78, 89, 60);
    for (var i = this.history.length - 1; i >= 0; i--) {
      var pos = this.history[i];

      ellipse(pos.x, pos.y, i, i);
      noStroke();
      if (i === 0) {
        push();
        translate(pos.x, pos.y);
        rotate(angle);
        fill(56, 78, 89, 160);
        rect(0, 0, 24, 48, 0, 20, 20, 0);
        // triangle(-10, 0, 16, 32, 16, -32);
        pop();
      } else if (i === 74) {
        push();
        translate(pos.x, pos.y);
        rotate(angle);
        fill(56, 78, 89, 160);
        rect(0, 0, 24, 98, 0, 20, 20, 0);
        pop();
      }
      // stroke(56, 78, 89);
      // vertex(pos.x, pos.y);
    }
    rectMode(CENTER);
    push();
    translate(this.position.x, this.position.y);
    rotate(angle);
    fill(255, 255, 255, 255);
    ellipse(20, -this.r/4, 12, 9);
    ellipse(20, this.r/4, 12, 9);
    triangle(44, -this.r/4, 50, -this.r/6, 60, -this.r/5);
    triangle(44, this.r/4, 50, this.r/6, 60, this.r/5);

    fill(254, 120, 120);
    ellipse(20, -this.r/4, 6, 6);
    ellipse(20, this.r/4, 6, 6);
    pop();
    // endShape();
  }
}

function Flock() {
  // An array for all the boids
    this.boids = []; // Initialize the array

  this.run = function() {
    for (var i = 0; i < this.boids.length; i++) {
      this.boids[i].run(this.boids);  // Passing the entire list of boids to each boid individually
    }
  };

  this.addBoid = function(b) {
    this.boids.push(b);
  };
}

function Boid(x,y) {
  this.acceleration = createVector(0,0);
  this.velocity = createVector(random(-1,1),random(-0.1,0.1));
  this.position = createVector(x,y);
  this.r = 3.0;
  this.maxspeed = 3;    // Maximum speed
  this.maxforce = 0.05; // Maximum steering force

  this.run = function(boids) {
    this.flock(boids);
    this.update();
    this.borders();
    this.render();
  };

  this.applyForce = function(force) {
    // We could add mass here if we want A = F / M
    this.acceleration.add(force);
  };

  // We accumulate a new acceleration each time based on three rules
  this.flock = function(boids) {
    var sep = this.separate(boids);   // Separation
    var ali = this.align(boids);      // Alignment
    var coh = this.cohesion(boids);   // Cohesion
    // Arbitrarily weight these forces
    sep.mult(1.5);
    ali.mult(1.0);
    coh.mult(1.0);
    // Add the force vectors to acceleration
    this.applyForce(sep);
    this.applyForce(ali);
    this.applyForce(coh);
  };

  // Method to update location
  this.update = function() {
    // Update velocity
    this.velocity.add(this.acceleration);
    // Limit speed
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    // Reset accelertion to 0 each cycle
    this.acceleration.mult(0);
  };

  // A method that calculates and applies a steering force towards a target
  // STEER = DESIRED MINUS VELOCITY
  this.seek = function(target) {
    var desired = p5.Vector.sub(target,this.position);  // A vector pointing from the location to the target
    // Normalize desired and scale to maximum speed
    desired.normalize();
    desired.mult(this.maxspeed);
    // Steering = Desired minus Velocity
    var steer = p5.Vector.sub(desired,this.velocity);
    steer.limit(this.maxforce);  // Limit to maximum steering force
    return steer;
  };

  this.render = function() {
    // Draw a triangle rotated in the direction of velocity
    push();
    noStroke();
    fill(255, 206, 142);
    translate(this.position.x, this.position.y);
    rotate(HALF_PI + atan2(this.velocity.y, this.velocity.x));
    beginShape();
    curveVertex(0, -0.5 * 12);
    curveVertex(0.2 * 12, 0);
    curveVertex(0, 1.5 * 12);
    curveVertex(-0.2 * 12, 0);
    curveVertex(0, -0.5 * 12);
    curveVertex(0.2 * 12, 0);
    curveVertex(0, 1.5 * 12);
    endShape();
    pop();
  };

  this.borders = function() {
    var desired = null;

    if (this.position.y < 50) {
      desired = createVector(this.velocity.x, this.maxspeed);
    } else if (this.position.y > height - 20) {
      desired = createVector(this.velocity.x, -this.maxspeed);
    }

    if (this.position.x < -this.r) {
      this.position.x = width + this.r;
    } else if (this.position.x > width +this.r) {
      this.position.x = -this.r;
    }

    if (desired !== null) {
      desired.normalize();
      desired.mult(this.maxspeed);
      var steer = p5.Vector.sub(desired, this.velocity);
      steer.limit(this.maxforce);
      this.applyForce(steer);
    }
  };

  // Separation
  // Method checks for nearby boids and steers away
  this.separate = function(boids) {
    var desiredseparation = 25.0;
    var steer = createVector(0,0);
    var count = 0;
    // For every boid in the system, check if it's too close
    for (var i = 0; i < boids.length; i++) {
      var d = p5.Vector.dist(this.position,boids[i].position);
      // If the distance is greater than 0 and less than an arbitrary amount (0 when you are yourself)
      if ((d > 0) && (d < desiredseparation)) {
        // Calculate vector pointing away from neighbor
        var diff = p5.Vector.sub(this.position,boids[i].position);
        diff.normalize();
        diff.div(d);        // Weight by distance
        steer.add(diff);
        count++;            // Keep track of how many
      }
    }
    // Average -- divide by how many
    if (count > 0) {
      steer.div(count);
    }

    // As long as the vector is greater than 0
    if (steer.mag() > 0) {
      // Implement Reynolds: Steering = Desired - Velocity
      steer.normalize();
      steer.mult(this.maxspeed);
      steer.sub(this.velocity);
      steer.limit(this.maxforce);
    }
    return steer;
  };

  // Alignment
  // For every nearby boid in the system, calculate the average velocity
  this.align = function(boids) {
    var neighbordist = 50;
    var sum = createVector(0,0);
    var count = 0;
    for (var i = 0; i < boids.length; i++) {
      var d = p5.Vector.dist(this.position,boids[i].position);
      if ((d > 0) && (d < neighbordist)) {
        sum.add(boids[i].velocity);
        count++;
      }
    }
    if (count > 0) {
      sum.div(count);
      sum.normalize();
      sum.mult(this.maxspeed);
      var steer = p5.Vector.sub(sum,this.velocity);
      steer.limit(this.maxforce);
      return steer;
    } else {
      return createVector(0,0);
    }
  };

  // Cohesion
  // For the average location (i.e. center) of all nearby boids, calculate steering vector towards that location
  this.cohesion = function(boids) {
    var neighbordist = 50;
    var sum = createVector(0,0);   // Start with empty vector to accumulate all locations
    var count = 0;
    for (var i = 0; i < boids.length; i++) {
      var d = p5.Vector.dist(this.position,boids[i].position);
      if ((d > 0) && (d < neighbordist)) {
        sum.add(boids[i].position); // Add location
        count++;
      }
    }
    if (count > 0) {
      sum.div(count);
      return this.seek(sum);  // Steer towards the location
    } else {
      return createVector(0,0);
    }
  };
}
