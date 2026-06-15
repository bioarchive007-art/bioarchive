'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Hero3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cleanupFn: (() => void) | undefined;
    let idleId: any;
    let timeoutId: any;

    const initThree = () => {
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'Interactive 3D rotating DNA double helix model. Move your cursor to rotate and interact.');
      container.appendChild(canvas);

      // Renderer
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance', // Hint to browser to use discrete GPU if available
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Capped at 1.5 for performance on mobile

      // Scene
      const scene = new THREE.Scene();

      // Camera
      const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
      camera.position.z = 12;

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
      scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0x00e5ff, 1.5);
      dirLight1.position.set(5, 5, 5);
      scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0x10b981, 1.2);
      dirLight2.position.set(-5, -5, 5);
      scene.add(dirLight2);

      const pointLight = new THREE.PointLight(0x00e5ff, 1.2, 15);
      pointLight.position.set(0, 0, 0);
      scene.add(pointLight);

      // DNA helix main group
      const dnaGroup = new THREE.Group();
      scene.add(dnaGroup);

      // DNA Geometry parameters
      const numPoints = 130;
      const radius = 2.0;
      const turns = 8.0;
      const height = 25.0;
      const angleOffset = 2.4;

      // Optimized segment counts: Spheres (8,8) instead of (16,16) saves 75% polygon overhead
      const sphereGeom = new THREE.SphereGeometry(0.16, 8, 8);
      const connectorGeom = new THREE.CylinderGeometry(0.032, 0.032, 1, 6); // 6 segments instead of 8
      const centerNodeGeom = new THREE.SphereGeometry(0.07, 6, 6); // 6 segments instead of 8

      // Materials with glassmorphic/glowing properties
      const materialStrand1 = new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        roughness: 0.1,
        metalness: 0.2,
        emissive: 0x008ebb,
        emissiveIntensity: 0.6,
      });

      const materialStrand2 = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.1,
        metalness: 0.2,
        emissive: 0x076d49,
        emissiveIntensity: 0.6,
      });

      const materialRung1 = new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        roughness: 0.2,
        metalness: 0.8,
        transparent: true,
        opacity: 0.55,
      });

      const materialRung2 = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.2,
        metalness: 0.8,
        transparent: true,
        opacity: 0.55,
      });

      const centerNodeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1.5,
        roughness: 0.1,
      });

      // Central axis support line (spine) representing rotation axis (4 segments prism is highly efficient)
      const axisGeo = new THREE.CylinderGeometry(0.015, 0.015, height, 4);
      const axisMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.25,
      });
      const axisMesh = new THREE.Mesh(axisGeo, axisMat);
      dnaGroup.add(axisMesh);

      // Create DNA strands
      for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        const angle = t * turns * Math.PI * 2;
        const y = (t - 0.5) * height;

        // Strand 1
        const x1 = Math.cos(angle) * radius;
        const z1 = Math.sin(angle) * radius;
        const pos1 = new THREE.Vector3(x1, y, z1);

        const sphere1 = new THREE.Mesh(sphereGeom, materialStrand1);
        sphere1.position.copy(pos1);
        dnaGroup.add(sphere1);

        // Strand 2
        const x2 = Math.cos(angle + angleOffset) * radius;
        const z2 = Math.sin(angle + angleOffset) * radius;
        const pos2 = new THREE.Vector3(x2, y, z2);

        const sphere2 = new THREE.Mesh(sphereGeom, materialStrand2);
        sphere2.position.copy(pos2);
        dnaGroup.add(sphere2);

        // Connecting Rungs
        if (i % 2 === 0) {
          const distance = pos1.distanceTo(pos2);
          const midPoint = new THREE.Vector3().addVectors(pos1, pos2).multiplyScalar(0.5);
          const halfDistance = distance / 2;

          const direction = new THREE.Vector3().subVectors(pos2, pos1).normalize();
          const alignAxis = new THREE.Vector3(0, 1, 0);

          // Rung half 1 (Cyan tint)
          const rung1 = new THREE.Mesh(connectorGeom, materialRung1);
          rung1.scale.set(1, halfDistance, 1);
          rung1.position.copy(pos1).add(midPoint).multiplyScalar(0.5);
          rung1.quaternion.setFromUnitVectors(alignAxis, direction);
          dnaGroup.add(rung1);

          // Rung half 2 (Emerald tint)
          const rung2 = new THREE.Mesh(connectorGeom, materialRung2);
          rung2.scale.set(1, halfDistance, 1);
          rung2.position.copy(pos2).add(midPoint).multiplyScalar(0.5);
          rung2.quaternion.setFromUnitVectors(alignAxis, direction);
          dnaGroup.add(rung2);

          // Center hydrogen bond node
          const centerNode = new THREE.Mesh(centerNodeGeom, centerNodeMat);
          centerNode.position.copy(midPoint);
          dnaGroup.add(centerNode);
        }
      }

      // Add dual-colored ambient particles background
      const particleCount = 150;
      const particleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const colorCyan = new THREE.Color(0x00e5ff);
      const colorEmerald = new THREE.Color(0x10b981);

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 15;

        const randomColor = Math.random() > 0.5 ? colorCyan : colorEmerald;
        colors[i * 3] = randomColor.r;
        colors[i * 3 + 1] = randomColor.g;
        colors[i * 3 + 2] = randomColor.b;
      }

      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const particleMat = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
      });

      const particles = new THREE.Points(particleGeometry, particleMat);
      scene.add(particles);

      // Mouse movement state
      let mouseTimeout: number = 0;
      let targetX = 0;
      let targetY = 0;
      let mouseX = 0;
      let mouseY = 0;

      // Throttle mousemove listeners via requestAnimationFrame to yield main thread
      const handleMouseMove = (event: MouseEvent) => {
        if (mouseTimeout) return;
        mouseTimeout = window.requestAnimationFrame(() => {
          mouseX = (event.clientX / window.innerWidth) - 0.5;
          mouseY = (event.clientY / window.innerHeight) - 0.5;
          mouseTimeout = 0;
        });
      };
      window.addEventListener('mousemove', handleMouseMove);

      // Scroll tracking
      let scrollY = 0;
      const handleScroll = () => {
        scrollY = window.scrollY;
      };
      window.addEventListener('scroll', handleScroll, { passive: true });

      // ResizeObserver for container-aware resizing
      const resizeObserver = new ResizeObserver((entries) => {
        if (!entries || entries.length === 0) return;
        const { width, height } = entries[0].contentRect;

        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      });
      resizeObserver.observe(container);

      // Visibility Observer: pause WebGL render loop when component is scrolled off-screen
      let isVisible = true;
      const intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            isVisible = entry.isIntersecting;
          });
        },
        { threshold: 0.05 }
      );
      intersectionObserver.observe(container);

      // Animation Loop
      let animationFrameId: number;
      const clock = new THREE.Clock();

      const animate = () => {
        // Request next frame but skip execution if canvas is off-screen
        if (!isVisible) {
          animationFrameId = requestAnimationFrame(animate);
          return;
        }

        const elapsedTime = clock.getElapsedTime();

        // Smooth interpolation for mouse tracking
        targetX += (mouseX - targetX) * 0.05;
        targetY += (mouseY - targetY) * 0.05;

        // Rotating on Y axis smoothly with a very subtle cursor tilt + scroll speed!
        dnaGroup.rotation.y = elapsedTime * 0.12 + scrollY * 0.0035;
        dnaGroup.rotation.x = targetY * Math.PI * 0.25;
        dnaGroup.rotation.z = targetX * Math.PI * 0.15;

        // Gently breathe/pulse the neon emissive glow of both strands
        const pulse = 0.55 + Math.sin(elapsedTime * 1.5) * 0.15;
        materialStrand1.emissiveIntensity = pulse;
        materialStrand2.emissiveIntensity = 0.7 - (pulse - 0.55);

        // Animate background particles
        const positionsArr = particles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          positionsArr[i * 3 + 1] += Math.sin(elapsedTime + i) * 0.002;
        }
        particles.geometry.attributes.position.needsUpdate = true;
        particles.rotation.y = -elapsedTime * 0.04;

        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(animate);
      };

      animate();

      cleanupFn = () => {
        cancelAnimationFrame(animationFrameId);
        if (mouseTimeout) cancelAnimationFrame(mouseTimeout);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('scroll', handleScroll);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();

        // Clean up WebGL resources
        sphereGeom.dispose();
        connectorGeom.dispose();
        centerNodeGeom.dispose();
        materialStrand1.dispose();
        materialStrand2.dispose();
        materialRung1.dispose();
        materialRung2.dispose();
        centerNodeMat.dispose();
        axisGeo.dispose();
        axisMat.dispose();
        particleGeometry.dispose();
        particleMat.dispose();
        renderer.dispose();

        if (container.contains(canvas)) {
          container.removeChild(canvas);
        }
      };
    };

    // Initialize deferred to prevent blocking critical paint path/hydration
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = (window as any).requestIdleCallback(initThree);
    } else {
      timeoutId = setTimeout(initThree, 50);
    }

    // Clean up
    return () => {
      if (idleId !== undefined) (window as any).cancelIdleCallback(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      if (cleanupFn) cleanupFn();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="three-canvas-container"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
      }}
    />
  );
}
