"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Mesh, Box3, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
import { useSpring, a } from "@react-spring/three";
import * as THREE from "three";
import { Html } from "@react-three/drei";

// Define model paths
const models: string[] = ["/models/macbook.glb", "/models/iphone.glb"];

// Define FOV values for each model
const fovValues: number[] = [40, 60];

interface MeshComponentProps {
    modelPath: string;
    onBoundingBoxCalculated: (center: Vector3, size: number) => void;
}

function MeshComponent({
    modelPath,
    onBoundingBoxCalculated,
}: MeshComponentProps) {
    const mesh = useRef<Mesh>(null!);
    const gltf = useLoader(GLTFLoader, modelPath);

    useEffect(() => {
        // Calculate bounding box
        const box = new Box3().setFromObject(gltf.scene);
        const center = new Vector3();
        box.getCenter(center);
        const size = box.getSize(new Vector3()).length();

        // Pass center and size to adjust camera dynamically
        onBoundingBoxCalculated(center, size);
    }, [gltf, onBoundingBoxCalculated]);

    useFrame(() => {
        if (mesh.current) {
            mesh.current.rotation.y += 0.001;
        }
    });

    return (
        <mesh ref={mesh}>
            <primitive object={gltf.scene} />
        </mesh>
    );
}

function ControlsTracker() {
    const controlsRef = useRef<OrbitControls | null>(null); // Type it correctly
    const { camera } = useThree();
    const [info, setInfo] = useState({
        position: new THREE.Vector3(),
        target: new THREE.Vector3(),
    });

    useFrame(() => {
        if (controlsRef.current) {
            setInfo({
                position: camera.position.clone(), // Get camera position
                target: controlsRef.current.target.clone(), // Get target position
            });
        }
    });

    return (
        <>
            {/* OrbitControls with ref */}
            <OrbitControls ref={controlsRef} />

            {/* Display camera and target values */}
            <div className="absolute top-4 left-4 bg-white p-2 rounded shadow-lg text-black text-sm z-10">
                <p>
                    Camera Position:{" "}
                    {info.position
                        .toArray()
                        .map((n) => n.toFixed(2))
                        .join(", ")}
                </p>
                <p>
                    Target:{" "}
                    {info.target
                        .toArray()
                        .map((n) => n.toFixed(2))
                        .join(", ")}
                </p>
            </div>
        </>
    );
}

export function ModelComponent() {
    const [selectedModel, setSelectedModel] = useState<number>(0);
    const [cameraTarget, setCameraTarget] = useState<Vector3>(
        new Vector3(0, 0, 0)
    );
    const [cameraDistance, setCameraDistance] = useState<number>(10);

    // Function to update camera position based on model size
    const updateCameraPosition = (center: Vector3, size: number) => {
        setCameraTarget(center);
        setCameraDistance(size * 1.5); // Adjust distance based on size
    };

    // Animate camera position & FOV on model change
    const { cameraPosition, fov } = useSpring({
        cameraPosition: [
            cameraTarget.x,
            cameraTarget.y + 3,
            cameraTarget.z + cameraDistance,
        ],
        fov: fovValues[selectedModel],
        config: { mass: 1, tension: 170, friction: 26 }, // Smooth transition
    });

    const switchModel = () => {
        setSelectedModel((prev) => (prev === 0 ? 1 : 0));
    };

    return (
        <div className="relative flex justify-center items-center h-full flex-grow bg-blue-100">
            {/* Model Switch Button */}
            <button
                onClick={switchModel}
                className="absolute top-4 left-4 bg-white p-2 rounded shadow-lg text-black z-10"
                style={{ pointerEvents: "auto" }} // Ensures button is clickable
            >
                Switch Model
            </button>

            {/* 3D Canvas */}
            <Canvas className="h-full w-full">
                {/* Smooth animated camera with dynamic positioning */}
                <a.perspectiveCamera
                    makeDefault
                    fov={fov as unknown as number}
                    position={cameraPosition as unknown as THREE.Vector3}
                />
                <OrbitControls
                    enabled={true}
                    target={[cameraTarget.x, cameraTarget.y, cameraTarget.z]}
                />
                <ambientLight intensity={3} />
                <directionalLight intensity={3} position={[5, 5, 5]} />

                {/* Key forces re-mounting when model changes */}
                <MeshComponent
                    key={models[selectedModel]}
                    modelPath={models[selectedModel]}
                    onBoundingBoxCalculated={updateCameraPosition}
                />
                <ControlsTracker />
            </Canvas>
        </div>
    );
}
