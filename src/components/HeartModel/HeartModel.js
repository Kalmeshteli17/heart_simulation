import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './HeartModel.css';

// Matches Unity frame configuration
const HEARTBEAT_FRAMES = {
  PQ: { start: 0, end: 14 },    // 15 frames (atrial depolarization)
  QRS: { start: 15, end: 30 },  // 16 frames (ventricular depolarization)
  ST: { start: 31, end: 60 }    // 30 frames (repolarization)
};
const TOTAL_FRAMES = 61;

const HeartModel = forwardRef(({ 
  color = '#ffffff', 
  lightIntensity = 0.2, 
  isPlaying = true,
  speedMultiplier = 1,
  onTimeUpdate,
  pqrstIntervals = [],
  currentPhase = 'ST',
  timeElapsed = 0 
}, ref) => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const mixerRef = useRef(null);
  const modelRef = useRef(null);
  const animationsRef = useRef([]);
  const directionalLightRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const animationIdRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const speedMultiplierRef = useRef(speedMultiplier);
  const lastPhaseRef = useRef('');
  const [debugInfo, setDebugInfo] = useState('Loading...');
  const [currentFrame, setCurrentFrame] = useState(0);

  // Sync props with refs
  useEffect(() => { 
    isPlayingRef.current = isPlaying;
    if (isPlaying) clockRef.current.start();
    else clockRef.current.stop();
  }, [isPlaying]);

  useEffect(() => { 
    speedMultiplierRef.current = speedMultiplier; 
  }, [speedMultiplier]);

  // Set exact frame based on Unity mapping
  const setExactFrame = (targetFrame) => {
    if (!mixerRef.current || targetFrame < 0 || targetFrame > TOTAL_FRAMES) return;
    
    const normalizedTime = targetFrame / TOTAL_FRAMES;
    animationsRef.current.forEach(clip => {
      const action = mixerRef.current.clipAction(clip);
      action.time = normalizedTime * clip.duration;
      action.paused = !isPlayingRef.current;
    });
    setCurrentFrame(targetFrame);
  };

  // Phase-based animation control
  useEffect(() => {
    if (!mixerRef.current || !pqrstIntervals.length) return;

    // Find current phase
    let currentPhaseData = null;
    let phaseIndex = 0;
    let phaseProgress = 0;

    for (let i = 0; i < pqrstIntervals.length; i++) {
      const phase = pqrstIntervals[i];
      if (timeElapsed >= phase.entry && timeElapsed < phase.entry + phase.duration) {
        currentPhaseData = phase;
        phaseIndex = i;
        phaseProgress = (timeElapsed - phase.entry) / phase.duration;
        break;
      }
    }

    if (currentPhaseData) {
      const frameRange = HEARTBEAT_FRAMES[currentPhaseData.phase];
      const targetFrame = Math.min(
        frameRange.end,
        frameRange.start + Math.floor((frameRange.end - frameRange.start) * phaseProgress)
      );

      // Reset animation when changing phases
      if (lastPhaseRef.current !== currentPhaseData.phase) {
        mixerRef.current.stopAllAction();
        animationsRef.current.forEach(clip => {
          const action = mixerRef.current.clipAction(clip)
            .setLoop(THREE.LoopOnce)
            .play();
          action.clampWhenFinished = true;
          action.paused = !isPlayingRef.current;
        });
        lastPhaseRef.current = currentPhaseData.phase;
      }

      setExactFrame(targetFrame);
      
      setDebugInfo(
        `Phase: ${currentPhaseData.phase} (${phaseIndex+1}/${pqrstIntervals.length})\n` +
        `Frame: ${targetFrame}/${TOTAL_FRAMES}\n` +
        `Progress: ${(phaseProgress * 100).toFixed(1)}%`
      );
    }
  }, [timeElapsed, pqrstIntervals]);

  // Three.js initialization
  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2c3e50);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0,1,5);
    camera.fov = 5;
    camera.updateProjectionMatrix();
    
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Lighting
    const directionalLight = new THREE.DirectionalLight(color, lightIntensity);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    directionalLightRef.current = directionalLight;
    scene.add(new THREE.AmbientLight(0x404040));
    
    // Controls
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.25;

    // Model loading
    const loader = new GLTFLoader();
    loader.load(
      process.env.PUBLIC_URL + '/human_heart_3d_model.glb',
      (gltf) => {
        modelRef.current = gltf.scene;
        scene.add(gltf.scene);
        animationsRef.current = gltf.animations || [];

        // Animation setup
        if (animationsRef.current.length) {
          mixerRef.current = new THREE.AnimationMixer(gltf.scene);
          
          // Debug animation info
          console.log('Loaded animations:');
          animationsRef.current.forEach((clip, i) => {
            console.log(`Clip ${i}: ${clip.name} (${clip.duration.toFixed(2)}s)`);
            const action = mixerRef.current.clipAction(clip)
              .setLoop(THREE.LoopOnce)
              .play();
            action.clampWhenFinished = true;
            action.paused = !isPlayingRef.current;
          });
          setDebugInfo('Model loaded with animations');
        } else {
          setDebugInfo('Model loaded but no animations found!');
        }
      },
      undefined,
      (error) => {
        console.error("Error loading model:", error);
        setDebugInfo('Error loading model!');
      }
    );

    sceneRef.current = scene;
    
    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta() * speedMultiplierRef.current;
      
      if (mixerRef.current) {
        mixerRef.current.update(delta);
        if (onTimeUpdate) onTimeUpdate(t => t + delta);
      }
      
      orbitControls.update();
      renderer.render(scene, camera);
    };
    
    animationIdRef.current = requestAnimationFrame(animate);

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      if (sceneRef.current) {
        sceneRef.current.traverse(child => {
          if (child.isMesh) {
            child.geometry?.dispose();
            child.material?.dispose();
          }
        });
      }
    };
  }, []);

  // Light updates
  useEffect(() => {
    if (directionalLightRef.current) {
      directionalLightRef.current.color.set(color);
      directionalLightRef.current.intensity = lightIntensity;
    }
  }, [color, lightIntensity]);

  // Expose methods
  useImperativeHandle(ref, () => ({
    getMixer: () => mixerRef.current,
    getScene: () => sceneRef.current,
    updateLight: (newColor, newIntensity) => {
      if (directionalLightRef.current) {
        directionalLightRef.current.color.set(newColor);
        directionalLightRef.current.intensity = newIntensity;
      }
    },
    setPlaying: (playing) => {
      isPlayingRef.current = playing;
      if (playing) clockRef.current.start();
      else clockRef.current.stop();
    },
    getDebugInfo: () => debugInfo,
    getCurrentFrame: () => currentFrame
  }));

  return (
    <div className="heart-container">
      <canvas ref={canvasRef} className="heart-canvas" />
      <div className="debug-overlay">
        <pre>{debugInfo}</pre>
        <div className="phase-progress" style={{
          width: `${(currentFrame / TOTAL_FRAMES) * 100}%`,
          backgroundColor: currentPhase === 'PQ' ? '#4e79a7' :
                          currentPhase === 'QRS' ? '#e15759' : '#59a14f'
        }} />
      </div>
    </div>
  );
});

export default HeartModel;