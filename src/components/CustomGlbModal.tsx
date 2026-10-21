/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, X, Check, Box, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { loadGlbFromArrayBuffer, loadGlbFromUrl, LoadedGlbResult } from '../models/glbLoader.ts';
import { SAMPLE_ONLINE_GLBS } from '../models/catalog.ts';
import { FurnitureModelDef } from '../types.ts';
import * as THREE from 'three';

interface CustomGlbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModelLoaded: (modelDef: FurnitureModelDef, object3D: THREE.Group) => void;
}

export const CustomGlbModal: React.FC<CustomGlbModalProps> = ({
  isOpen,
  onClose,
  onModelLoaded,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'samples'>('upload');
  const [modelName, setModelName] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [targetWidth, setTargetWidth] = useState<number>(1.8);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<{
    result: LoadedGlbResult;
    name: string;
    fileSizeStr?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      setError('Please provide a valid 3D file (.glb or .gltf format).');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const loaded = await loadGlbFromArrayBuffer(buffer, targetWidth);
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const cleanName = nameWithoutExt.charAt(0).toUpperCase() + nameWithoutExt.slice(1);

      const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);

      setParsedPreview({
        result: loaded,
        name: cleanName,
        fileSizeStr: `${sizeInMb} MB`,
      });
      setModelName(cleanName);
    } catch (err: unknown) {
      console.error('Error loading custom GLB:', err);
      setError('Failed to parse 3D GLB file. Make sure it is a valid binary glTF model.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUrlLoad = async (url: string, customTitle?: string) => {
    if (!url.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await loadGlbFromUrl(url.trim(), targetWidth);
      const inferredName = customTitle || url.split('/').pop()?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Custom 3D Model';
      setParsedPreview({
        result: loaded,
        name: inferredName,
        fileSizeStr: 'Remote Asset',
      });
      setModelName(inferredName);
    } catch (err: unknown) {
      console.error('Error loading remote GLB:', err);
      setError('Unable to load GLB from URL. Ensure the URL is CORS-enabled and directly links to a .glb file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAdd = () => {
    if (!parsedPreview) return;

    const id = `custom-glb-${Date.now()}`;
    const def: FurnitureModelDef = {
      id,
      name: modelName || parsedPreview.name || 'Custom 3D Model',
      category: 'custom',
      description: 'Custom user-imported 3D GLB interior model.',
      defaultDimensions: parsedPreview.result.dimensions,
      isCustomGlb: true,
      colors: [
        { name: 'Original', hex: '#ffffff' },
        { name: 'Charcoal Tint', hex: '#262a30' },
        { name: 'Warm Cream', hex: '#e8dec8' },
      ],
    };

    onModelLoaded(def, parsedPreview.result.group);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Add Custom GLB 3D Model</h3>
              <p className="text-xs text-zinc-400">Import your own furniture design into the AR camera scene</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 p-1">
          <button
            onClick={() => { setActiveTab('upload'); setError(null); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'upload' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload File (.glb)
          </button>
          <button
            onClick={() => { setActiveTab('url'); setError(null); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'url' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Paste GLB URL
          </button>
          <button
            onClick={() => { setActiveTab('samples'); setError(null); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'samples' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Sample Models
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: File Upload */}
          {activeTab === 'upload' && (
            <div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-700 hover:border-cyan-500/60 rounded-xl p-8 text-center bg-zinc-950/40 hover:bg-zinc-950/70 transition-all cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".glb,.gltf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-12 h-12 mx-auto rounded-full bg-zinc-800 group-hover:bg-cyan-500/10 text-zinc-400 group-hover:text-cyan-400 flex items-center justify-center transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium text-zinc-200 mt-3">
                  Click to browse or drag and drop your <span className="text-cyan-400 font-semibold">.GLB</span> file
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Supports standard binary glTF 2.0 furniture models
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Direct URL */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-300 font-medium block mb-1.5">
                  Direct GLB Asset URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/models/sofa.glb"
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => handleUrlLoad(urlInput)}
                    disabled={!urlInput.trim() || isLoading}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    Load
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-zinc-500">
                Hint: Any publicly hosted CORS-accessible URL ending in .glb or raw GitHub CDN model can be loaded.
              </p>
            </div>
          )}

          {/* TAB 3: Sample Models */}
          {activeTab === 'samples' && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-400">
                Try one of these standard Khronos test models to test custom GLB placement:
              </p>
              <div className="grid grid-cols-1 gap-2 pt-1">
                {SAMPLE_ONLINE_GLBS.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleUrlLoad(sample.url, sample.name)}
                    className="w-full text-left p-3 rounded-xl bg-zinc-950/60 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div>
                      <div className="text-xs font-medium text-zinc-200 group-hover:text-cyan-400 transition-colors">
                        {sample.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {sample.dimensions.width}m × {sample.dimensions.depth}m × {sample.dimensions.height}m
                      </div>
                    </div>
                    <span className="text-xs text-cyan-400 font-medium px-2 py-1 rounded bg-cyan-500/10">
                      Load Sample
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-6 rounded-xl bg-zinc-950/50 border border-zinc-800 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              <p className="text-xs text-zinc-300 font-medium">Parsing 3D geometry & textures...</p>
              <p className="text-[11px] text-zinc-500">Normalizing coordinate scale and grounding base to floor</p>
            </div>
          )}

          {/* Model Parsed Preview Card */}
          {parsedPreview && !isLoading && (
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-zinc-100">3D Model Ready</span>
                    <span className="text-[10px] text-zinc-400 ml-2">({parsedPreview.fileSizeStr})</span>
                  </div>
                </div>
              </div>

              {/* Editable Name */}
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Model Name / Label</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Parsed Dimensions */}
              <div className="grid grid-cols-3 gap-2 text-center bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Width</div>
                  <div className="text-xs font-semibold text-zinc-200">
                    {parsedPreview.result.dimensions.width} m
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Depth</div>
                  <div className="text-xs font-semibold text-zinc-200">
                    {parsedPreview.result.dimensions.depth} m
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Height</div>
                  <div className="text-xs font-semibold text-zinc-200">
                    {parsedPreview.result.dimensions.height} m
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/40 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmAdd}
            disabled={!parsedPreview || isLoading}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Box className="w-3.5 h-3.5" />
            Place Model In AR
          </button>
        </div>
      </div>
    </div>
  );
};
