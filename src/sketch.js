// Visualization settings
const nodeSize = 60;
const nodePositions = {};
let initialized = false;

// Animation settings
const moveAnimationDuration = 2000; // 2 seconds to match simulation interval
let lastMoveTime = 0;
let robotStartPos = null;
let robotTargetPos = null;
let deliveryAnimations = []; // Store active delivery animations

export default function (p) {
  p.setup = function () {
    const cnv = p.createCanvas(1200, 620);
    cnv.parent('sketch');
    p.textAlign(p.CENTER, p.CENTER);

    if (!initialized) {
      // Calculate initial positions for nodes in a circle layout
      const nodes = [
        '👩',
        '👴',
        '⛲',
        '🏤',
        '🏢',
        '👩🏿‍🦱',
        '👩‍🦰',
        '👩‍🦳',
        '🐮',
        '🛒',
        '⛺',
      ];
      const centerX = p.width / 2;
      const centerY = p.height / 2;
      const radius = Math.min(p.width, p.height) / 3;

      nodes.forEach((node, i) => {
        const angle = (i / nodes.length) * 2 * Math.PI;
        nodePositions[node] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        };
      });
      initialized = true;
    }
  };

  p.draw = function () {
    p.background(240);

    // Draw roads (connections between places)
    p.stroke(150);
    p.strokeWeight(2);
    if (window.roads) {
      window.roads.forEach((road) => {
        const [from, to] = road.split('-');
        const fromPos = nodePositions[from];
        const toPos = nodePositions[to];
        if (fromPos && toPos) {
          p.line(fromPos.x, fromPos.y, toPos.x, toPos.y);
        }
      });
    }

    // Draw locations
    Object.entries(nodePositions).forEach(([name, pos]) => {
      p.push();
      // Location circle
      p.fill(255);
      p.stroke(0);
      p.strokeWeight(1);
      p.circle(pos.x, pos.y, nodeSize);

      // Location emoji
      p.textSize(32);
      p.noStroke();
      p.text(name, pos.x, pos.y);
      p.pop();
    });

    // Draw current state if available
    if (window.currentState) {
      const currentRobotPos = nodePositions[window.currentState.place];

      // Handle robot movement animation
      if (currentRobotPos) {
        if (!robotStartPos) {
          robotStartPos = { ...currentRobotPos };
          robotTargetPos = { ...currentRobotPos };
          lastMoveTime = p.millis();
        } else if (
          robotTargetPos.x !== currentRobotPos.x ||
          robotTargetPos.y !== currentRobotPos.y
        ) {
          // Robot is moving to a new position
          robotStartPos = { ...robotTargetPos };
          robotTargetPos = { ...currentRobotPos };
          lastMoveTime = p.millis();
        }

        // Calculate interpolated position
        const timePassed = p.millis() - lastMoveTime;
        const progress = Math.min(timePassed / moveAnimationDuration, 1);
        const easedProgress = 0.5 - Math.cos(progress * Math.PI) / 2; // Smooth easing

        const interpolatedX =
          robotStartPos.x +
          (robotTargetPos.x - robotStartPos.x) * easedProgress;
        const interpolatedY =
          robotStartPos.y +
          (robotTargetPos.y - robotStartPos.y) * easedProgress;

        // Draw robot with bobbing animation
        p.push();
        p.textSize(40);
        const bobHeight = Math.sin(progress * Math.PI * 2) * 5; // Add slight bobbing
        p.text('🤖', interpolatedX, interpolatedY - nodeSize / 2 + bobHeight);
        p.pop();

        // Check for deliveries and create animations
        if (window.delivered) {
          const lastDelivery = window.delivered[window.delivered.length - 1];
          if (lastDelivery && lastDelivery.turn === window.turn) {
            deliveryAnimations.push({
              x: interpolatedX,
              y: interpolatedY - nodeSize / 2,
              startTime: p.millis(),
              text: '✨',
            });
          }
        }
      }

      // Draw parcels
      window.currentState.parcels.forEach((parcel) => {
        const pos = nodePositions[parcel.place];
        if (pos) {
          p.push();
          p.textSize(24);
          p.text('📦', pos.x + 20, pos.y - 20);
          // Draw parcel destination
          const destPos = nodePositions[parcel.address];
          if (destPos) {
            p.stroke(255, 100, 100, 100);
            p.strokeWeight(1);
            p.line(pos.x, pos.y, destPos.x, destPos.y);
          }
          p.pop();
        }
      });

      // Update and draw delivery animations
      deliveryAnimations = deliveryAnimations.filter((animation) => {
        const animationAge = p.millis() - animation.startTime;
        if (animationAge < 1000) {
          // Animation lasts 1 second
          p.push();
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(30);
          const progress = animationAge / 1000;
          const y = animation.y - progress * 40; // Float upward
          const alpha = 255 * (1 - progress); // Fade out
          p.fill(255, 255, 255, alpha);
          p.text(animation.text, animation.x, y);
          p.pop();
          return true;
        }
        return false;
      });
    }

    // Draw status
    p.fill(0);
    p.noStroke();
    p.textAlign(p.LEFT, p.TOP);
    p.textSize(16);
    let statusY = 10;
    // Turn
    p.text(`Turn: ${window.turn || 0}`, 10, statusY);
    statusY += 20;
    if (window.currentState) {
      p.text(`Robot at: ${window.currentState.place}`, 10, statusY);
      statusY += 20;
      p.text(
        `Parcels remaining: ${window.currentState.parcels.length}`,
        10,
        statusY
      );
      statusY += 24;
    }

    // Parcel tracking table
    if (
      (window.picked && window.picked.length > 0) ||
      (window.delivered && window.delivered.length > 0)
    ) {
      p.textSize(14);
      // Table header
      p.text('Parcel', 10, statusY);
      p.text('Pickup', 160, statusY);
      p.text('Delivery', 240, statusY);
      statusY += 20;

      // Draw horizontal line
      p.stroke(150);
      p.line(10, statusY - 4, 320, statusY - 4);
      p.noStroke();

      const maxShow = window.initialParcelCount || 10;
      // Create a map of parcels with their pickup and delivery turns
      const parcelMap = new Map();

      // Add pickup information
      if (window.picked) {
        window.picked.forEach((p) => {
          parcelMap.set(`${p.from}->${p.to}`, {
            pickup: p.turn,
            delivery: '-',
          });
        });
      }

      // Add delivery information
      if (window.delivered) {
        window.delivered.forEach((d) => {
          const key = `${d.from}->${d.to}`;
          const parcel = parcelMap.get(key) || { pickup: '-' };
          parcel.delivery = d.turn;
          parcelMap.set(key, parcel);
        });
      }

      // Display the table
      Array.from(parcelMap.entries())
        .slice(-maxShow)
        .forEach(([route, turns], i) => {
          p.text(route, 10, statusY + i * 16);
          p.text(turns.pickup, 160, statusY + i * 16);
          p.text(turns.delivery, 240, statusY + i * 16);
        });

      statusY += Math.min(parcelMap.size, maxShow) * 16 + 6;
      p.textSize(16);
    }

    // Note: final total turns are reflected in the current `Turn` value
  };
}
