"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { BokehPass, RenderPass } from "three/examples/jsm/Addons.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";

export default function ThreeDemo() {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mountRef.current) return;

        // SCENE
        const scene = new THREE.Scene();

        // CAMERA
        const camera = new THREE.PerspectiveCamera(
            75, // Field of view in degrees
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near plane
            1000 // Far plane
        );
        camera.position.z = 5;

        // CONFIG
        const config = {
            zoom: {
                minDistance: 2,
                maxDistance: 10,
                zoomSpeed: 0.1,
            },
            movement: {
                acceleraton: 0.05,
                friction: 0.93,
                maxVelocity: 0.3,
                horizontalSpeed: 0.5,
                fadeSpeed: 0.05,
                startX: 0,
                endX: -5,
                startZ: 0,
                endZ: 3,
                startY: 0,
                endY: -5,
                startYRotation: 0,
                endYRotation: Math.PI / 4,
                initialOpacity: 1,
            },
            dof: {
                focus: 5,
                aperture: 0.01,
                maxBlur: 0.01,
            },
        };

        const state = {
            velocity: 0,
        };

        // RENDERER
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountRef.current.appendChild(renderer.domElement);

        // Gradient Shader Material
        const gradientMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color1: { value: new THREE.Color(0x191e24) }, // Dark gray
                color2: { value: new THREE.Color(0x011936) }, // Blue
                color3: { value: new THREE.Color(0x191e24) }, // Dark gray
            },
            vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
            fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec2 vUv;
        void main() {
            float gradient = smoothstep(0.0, 0.5, vUv.y) - smoothstep(0.5, 1.0, vUv.y);
            vec3 color = mix(color1, color2, vUv.y) + color3 * gradient;
            gl_FragColor = vec4(color, 1.0);
        }
    `,
            side: THREE.DoubleSide,
        });

        // Create a large background plane
        const backgroundGeometry = new THREE.PlaneGeometry(100, 100);
        const backgroundMesh = new THREE.Mesh(
            backgroundGeometry,
            gradientMaterial
        );

        // Position the background plane
        backgroundMesh.position.z = -10; // Place it far behind the objects
        scene.add(backgroundMesh);

        // PLANE
        const planeGeometry = new THREE.PlaneGeometry(1, 1);
        const planeMaterial = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            opacity: config.movement.initialOpacity,
        });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.position.x = config.movement.startX;
        plane.position.z = config.movement.startZ;
        plane.position.y = config.movement.startY;
        plane.rotation.y = config.movement.startYRotation;
        scene.add(plane);

        // SECOND PLANE
        const plane2 = new THREE.Mesh(planeGeometry, planeMaterial);
        plane2.position.x = config.movement.startX + 3;
        plane2.position.z = config.movement.startZ - 3;
        plane2.position.y = config.movement.startY + 3;
        plane2.rotation.y = config.movement.startYRotation;
        scene.add(plane2);

        // POST PROCESSING
        const composer = new EffectComposer(renderer);

        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        const bokehPass = new BokehPass(scene, camera, {
            focus: config.dof.focus,
            aperture: config.dof.aperture,
            maxblur: config.dof.maxBlur,
        });
        composer.addPass(bokehPass);

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            "https://raw.githubusercontent.com/braiann/portfolio/refs/heads/main/resources/images/project-screenshots/gobeyond.webp",
            (texture) => {
                const imageAspect = texture.image.width / texture.image.height;

                const planeHeight = 3;
                const planeWidth = planeHeight * imageAspect;
                plane.geometry.dispose();
                plane.geometry = new THREE.PlaneGeometry(
                    planeWidth,
                    planeHeight
                );

                planeMaterial.map = texture;
                planeMaterial.needsUpdate = true;
            }
        );
        textureLoader.load(
            "https://raw.githubusercontent.com/braiann/portfolio/refs/heads/main/resources/images/project-screenshots/digitalexecutive.webp",
            (texture) => {
                const imageAspect = texture.image.width / texture.image.height;

                const planeHeight = 3;
                const planeWidth = planeHeight * imageAspect;

                plane2.geometry.dispose();
                plane2.geometry = new THREE.PlaneGeometry(
                    planeWidth,
                    planeHeight
                );

                planeMaterial.map = texture;
                planeMaterial.needsUpdate = true;
            }
        );

        // LIGHTS
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(2, 2, 2);
        scene.add(directionalLight);

        // RESIZE
        function handleResize() {
            const width = window.innerWidth;
            const height = window.innerHeight;

            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(width, height);
            bokehPass.setSize(width, height);
        }
        window.addEventListener("resize", handleResize);

        // CONTROLS
        function handleWheel(event: WheelEvent) {
            event.preventDefault();

            const delta = Math.sign(event.deltaY);

            state.velocity -= delta * config.movement.acceleraton;
            state.velocity = Math.max(
                Math.min(state.velocity, config.movement.maxVelocity),
                -config.movement.maxVelocity
            );
        }
        mountRef.current.addEventListener("wheel", handleWheel, {
            passive: false,
        });

        // ANIMATE
        function animate() {
            requestAnimationFrame(animate);

            const newXPosition = camera.position.x + state.velocity;
            camera.position.x = newXPosition;

            const newZPosition = THREE.MathUtils.lerp(
                5,
                10,
                (newXPosition - config.movement.startX) /
                    (config.movement.endX - config.movement.startX)
            );
            camera.position.z = newZPosition;

            const newYPosition = THREE.MathUtils.lerp(
                config.movement.startY,
                config.movement.endY,
                (newXPosition - config.movement.startX) /
                    (config.movement.endX - config.movement.startX)
            );
            camera.position.y = newYPosition;

            const newYRotation = THREE.MathUtils.lerp(
                config.movement.startYRotation,
                config.movement.endYRotation,
                (newXPosition - config.movement.startX) /
                    (config.movement.endX - config.movement.startX)
            );
            // camera.rotation.y = newYRotation;

            const distanceFromCenter = Math.abs(newXPosition);
            const maxDistance = 5;
            const opacity = 1 - distanceFromCenter / maxDistance;
            // plane.material.opacity = Math.max(0, Math.min(1, opacity));

            state.velocity *= config.movement.friction;

            composer.render();
        }

        animate();

        // CLEANUP
        return () => {
            window.removeEventListener("resize", handleResize);
            mountRef.current?.removeEventListener("wheel", handleWheel);
            mountRef.current?.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, []);

    return <div ref={mountRef} className="w-screen h-screen" />;
}
