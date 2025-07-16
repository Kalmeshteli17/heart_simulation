import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { getPhaseDurations, PHASE_TO_FRAMES } from './animationConfig';

const AnimationManager = forwardRef(({ 
  setCurrentPhase, 
  isPlaying, 
  speedMultiplier,
  realBPM,
  timeElapsed,
  pqrstIntervals = [],
  onVirtualBPMChange // Add this callback prop
}, ref) => {
  const mixerRef = useRef(null);
  const currentPhaseRef = useRef('ST');
  const qrsCountRef = useRef(0);
  const lastQrsTimeRef = useRef(0);
  const bpmTimeoutRef = useRef(null);
  const [virtualBPM, setVirtualBPM] = useState(0);

  // Calculate BPM based on QRS counts
  const calculateBPM = () => {
    if (qrsCountRef.current > 0) {
      const newBPM = Math.min(qrsCountRef.current * 2, 200); // Scale counts to BPM
      setVirtualBPM(newBPM);
      onVirtualBPMChange?.(newBPM);
    }
    qrsCountRef.current = 0;
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    initialize: (mixer) => {
      mixerRef.current = mixer;
    },
    getCurrentPhase: () => currentPhaseRef.current,
    getVirtualBPM: () => virtualBPM
  }));

  // Update phase and count QRS complexes
  useEffect(() => {
    if (!pqrstIntervals || pqrstIntervals.length === 0) return;

    let newPhase = 'ST';
    for (const interval of pqrstIntervals) {
      if (timeElapsed >= interval.entry && timeElapsed < interval.entry + interval.duration) {
        newPhase = interval.phase;
        
        // Count QRS complexes
        if (newPhase === 'QRS' && currentPhaseRef.current !== 'QRS') {
          const now = Date.now();
          if (now - lastQrsTimeRef.current > 200) { // Debounce 200ms
            qrsCountRef.current += 1;
            lastQrsTimeRef.current = now;
          }
        }
        break;
      }
    }

    if (currentPhaseRef.current !== newPhase) {
      currentPhaseRef.current = newPhase;
      setCurrentPhase(newPhase);
      updateAnimationForPhase(newPhase);
    }
  }, [timeElapsed, pqrstIntervals, setCurrentPhase]);

  // Update BPM calculation every second
  useEffect(() => {
    if (isPlaying) {
      bpmTimeoutRef.current = setInterval(calculateBPM, 1000);
    }
    return () => {
      if (bpmTimeoutRef.current) {
        clearInterval(bpmTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  const updateAnimationForPhase = (phase) => {
    if (!mixerRef.current) return;
    
    const [startFrame, endFrame] = PHASE_TO_FRAMES[phase];
    const actions = mixerRef.current._actions;
    
    Object.values(actions).forEach(action => {
      action.time = startFrame / 24;
      action.setEffectiveTimeScale(speedMultiplier);
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
      action.reset().play();
    });
  };

  // Handle play/pause and speed changes
  useEffect(() => {
    if (!mixerRef.current) return;
    
    const actions = mixerRef.current._actions;
    Object.values(actions).forEach(action => {
      action.paused = !isPlaying;
      action.setEffectiveTimeScale(speedMultiplier);
    });

    // Reset counters when pausing
    if (!isPlaying) {
      qrsCountRef.current = 0;
      setVirtualBPM(0);
    }
  }, [isPlaying, speedMultiplier]);

  return null;
});

export default AnimationManager;