"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { Upload } from 'lucide-react';
import type { BuildingData, Room } from './types';
import { createColorBoxMode } from './mode/colorBoxMode';
import { createMaterialMode } from './mode/materialMode';
import { createWireframeMode } from './mode/wireframeMode';
import { resetHoverEffects, applyHoverEffects, HoveredObjects } from './effect/hoverEffects';
import {
  FLOOR_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  ROOM_COLORS,
  MATERIALS,
  GLASS_WALLED_ROOMS,
  LABEL_STYLES,
  CAMERA_CONFIG,
  LIGHTING_CONFIG,
  HOVER_EFFECTS
} from './build_config';

const BuildingViewer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showMaterialMode, setShowMaterialMode] = useState(true);
  const [showColorBox, setShowColorBox] = useState(true);
  const [buildingData, setBuildingData] = useState<BuildingData | null>(null);
  const [error, setError] = useState('');
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredRoom, setHoveredRoom] = useState<Room | null>(null);
  
  const hoveredObjectsRef = useRef<{
    color: THREE.Mesh | null,
    material: THREE.Mesh | null,
    wireframe: THREE.Mesh | null
  }>({
    color: null,
    material: null,
    wireframe: null
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const result = e.target?.result;
        if (typeof result === 'string') {
          const data = JSON.parse(result) as BuildingData;
          setBuildingData(data);
          setError('');
        }
      } catch (err) {
        setError('Invalid JSON file format');
        console.error('Error parsing JSON:', err);
      }
    };
    reader.onerror = () => {
      setError('Error reading file');
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (!buildingData || !mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(
      CAMERA_CONFIG.fov, 
      CANVAS_WIDTH / CANVAS_HEIGHT, 
      CAMERA_CONFIG.near, 
      CAMERA_CONFIG.far
    );
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
    renderer.setClearColor(0xf0f0f0);
    mountRef.current.appendChild(renderer.domElement);

    // Create CSS2D renderer for labels
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    mountRef.current.appendChild(labelRenderer.domElement);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(
      LIGHTING_CONFIG.ambient.color, 
      LIGHTING_CONFIG.ambient.intensity
    );
    const directionalLight = new THREE.DirectionalLight(
      LIGHTING_CONFIG.directional.color, 
      LIGHTING_CONFIG.directional.intensity
    );
    directionalLight.position.set(
      LIGHTING_CONFIG.directional.position.x,
      LIGHTING_CONFIG.directional.position.y,
      LIGHTING_CONFIG.directional.position.z
    );
    scene.add(ambientLight);
    scene.add(directionalLight);

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Calculate building bounds
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    buildingData.forEach(floor => {
      floor.rooms.forEach(room => {
        room.room_shape.coords.forEach(([x, z]) => {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minZ = Math.min(minZ, z);
          maxZ = Math.max(maxZ, z);
        });
      });
    });

    const centerX = (maxX + minX) / 2;
    const centerZ = (maxZ + minZ) / 2;

    // Create room label
    const createRoomLabel = (room: Room, position: THREE.Vector3, floorNum: number): CSS2DObject => {
      const div = document.createElement('div');
      div.className = 'label';
      Object.assign(div.style, LABEL_STYLES);
      div.style.opacity = '0'; // Start hidden
      
      const content = [
        `Type: ${room.room_type}`,
        `Floor: ${floorNum}`,
        room.room_id ? `ID: ${room.room_id}` : '',
        room.room_name ? `Name: ${room.room_name}` : ''
      ].filter(Boolean).join('\n');
      
      div.textContent = content;
      div.id = `label-${room.room_id || Math.random().toString(36).substring(2, 10)}`;
      
      const label = new CSS2DObject(div);
      label.position.copy(position);
      label.userData.domElement = div;
      label.userData.roomData = room;
      return label;
    };

    const createRoom = (room: Room, floorHeight: number, floorNum: number): THREE.Group => {
      const group = new THREE.Group();
      
      // Create room shape
      const shape = new THREE.Shape();
      const coords = room.room_shape.coords.map(([x, z]) => [-1 * (x - centerX), z - centerZ]);
      
      shape.moveTo(coords[0][0], coords[0][1]);
      for (let i = 1; i < coords.length; i++) {
        shape.lineTo(coords[i][0], coords[i][1]);
      }
  
      const extrudeSettings = {
        steps: 1,
        depth: FLOOR_HEIGHT,
        bevelEnabled: false
      };
  
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      
      // Calculate center position for the label
      const avgX = coords.reduce((sum, [x]) => sum + x, 0) / coords.length;
      const avgZ = coords.reduce((sum, [, z]) => sum + z, 0) / coords.length;
      const labelPosition = new THREE.Vector3(avgX, floorHeight + FLOOR_HEIGHT/2, avgZ);
      
      const roomId = room.room_id || `room-${Math.random().toString(36).substring(2, 10)}`;
  
      // Add visualization modes based on state
      if (showMaterialMode) {
        group.add(createMaterialMode(room, floorHeight, geometry, roomId, labelPosition, floorNum));
      }
  
      if (showColorBox) {
        group.add(createColorBoxMode(room, floorHeight, geometry, roomId, labelPosition, floorNum));
      }
  
      if (showWireframe) {
        group.add(createWireframeMode(room, floorHeight, geometry, roomId, labelPosition, floorNum));
      }
  
      // Add label if enabled
      if (showLabels) {
        const label = createRoomLabel(room, labelPosition, floorNum);
        label.userData.roomId = roomId;
        group.add(label);
      }
  
      return group;
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Helper function to reset hover effects
    
    // Helper function to apply hover effects for a room
    
    const onMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      resetHoverEffects(hoveredObjectsRef.current, scene);

      let foundValidIntersection = false;
      for (let i = 0; i < intersects.length; i++) {
        const intersectedObject = intersects[i].object as THREE.Mesh;
        const roomData = intersectedObject.userData.roomData;
        
        if (roomData && intersectedObject.userData.roomId) {
          applyHoverEffects(
            intersectedObject.userData.roomId,
            scene,
            hoveredObjectsRef.current
          );
          setHoveredRoom(roomData);
          foundValidIntersection = true;
          break;
        }
      }
      
      if (!foundValidIntersection) {
        setHoveredRoom(null);
      }
    };

    const onMouseLeave = () => {
      resetHoverEffects(hoveredObjectsRef.current, scene);
      setHoveredRoom(null);
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseleave', onMouseLeave);

    scene.clear();
    scene.add(ambientLight);
    scene.add(directionalLight);

    const buildingGroup = new THREE.Group();

    // Add rooms for each floor
    buildingData.forEach((floor, index) => {
      const floorHeight = index * FLOOR_HEIGHT;
      
      floor.rooms.forEach(room => {
        const roomGroup = createRoom(room, floorHeight, index);
        buildingGroup.add(roomGroup);
      });
    });

    scene.add(buildingGroup);

    // Position camera
    const buildingHeight = buildingData.length * FLOOR_HEIGHT;
    const maxDimension = Math.max(maxX - minX, maxZ - minZ);
    camera.position.set(
      maxDimension * CAMERA_CONFIG.initialPositionMultiplier.x,
      buildingHeight * CAMERA_CONFIG.initialPositionMultiplier.y,
      maxDimension * CAMERA_CONFIG.initialPositionMultiplier.z
    );
    camera.lookAt(0, buildingHeight / 2, 0);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
      camera.updateProjectionMatrix();
      renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
      labelRenderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
        mountRef.current.removeChild(labelRenderer.domElement);
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('mouseleave', onMouseLeave);
      }
      // Reset hover effects in cleanup with proper arguments
      if (sceneRef.current) {
        resetHoverEffects(hoveredObjectsRef.current, sceneRef.current);
      }
    };
  }, [buildingData, showWireframe, showLabels, showMaterialMode, showColorBox]);

  return (
    <Card className="p-4 w-full max-w-4xl">
      <div className="flex flex-col gap-4">
        {!buildingData ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
            <Upload className="w-12 h-12 mb-4 text-gray-400" />
            <label className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer">
              Upload JSON File
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {error && <p className="mt-2 text-red-500">{error}</p>}
          </div>
        ) : (
          <>
            <div className="flex gap-4 items-center">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showColorBox}
                  onChange={() => setShowColorBox(prev => !prev)}
                  className="form-checkbox"
                />
                <span>ColorBox Mode</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showMaterialMode}
                  onChange={() => setShowMaterialMode(prev => !prev)}
                  className="form-checkbox"
                />
                <span>Material Mode</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showWireframe}
                  onChange={() => setShowWireframe(prev => !prev)}
                  className="form-checkbox"
                />
                <span>Wireframe Mode</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={() => setShowLabels(prev => !prev)}
                  className="form-checkbox"
                />
                <span>Show Labels</span>
              </label>
              <button 
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                onClick={() => setBuildingData(null)}
              >
                Load New File
              </button>
            </div>
            <div ref={mountRef} className="w-full h-[600px] border rounded relative" />
            <div className="text-center">
              Total Floors: {buildingData.length}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default BuildingViewer;