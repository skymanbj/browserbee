import React from 'react';

export interface Model {
  id: string;
  name: string;
  isReasoningModel?: boolean;
  contextWindow?: number;
  maxTokens?: number;
}

interface ModelListProps {
  models: Model[];
  setModels: (models: Model[]) => void;
  newModel: { id: string; name: string; isReasoningModel: boolean; contextWindow: number; maxTokens: number };
  setNewModel: React.Dispatch<React.SetStateAction<{ id: string; name: string; isReasoningModel: boolean; contextWindow: number; maxTokens: number }>>;
  handleAddModel: () => void;
  handleRemoveModel: (id: string) => void;
  handleEditModel: (idx: number, field: string, value: any) => void;
}

export function ModelList({
  models,
  setModels,
  newModel,
  setNewModel,
  handleAddModel,
  handleRemoveModel,
  handleEditModel
}: ModelListProps) {
  return (
    <div className="form-control mb-4">
      <label className="label">
        <span className="label-text">Model List:</span>
      </label>
      <table className="table table-zebra w-full mb-2">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Reasoning?</th>
            <th>Context Window</th>
            <th>Max Tokens</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {models.map((model, idx) => (
            <tr key={model.id}>
              <td>
                <input
                  className="input input-bordered input-sm w-full"
                  value={model.id}
                  onChange={e => handleEditModel(idx, 'id', e.target.value)}
                />
              </td>
              <td>
                <input
                  className="input input-bordered input-sm w-full"
                  value={model.name}
                  onChange={e => handleEditModel(idx, 'name', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={!!model.isReasoningModel}
                  onChange={e => handleEditModel(idx, 'isReasoningModel', e.target.checked)}
                />
              </td>
              <td>
                <input
                  className="input input-bordered input-sm w-24"
                  type="number"
                  value={model.contextWindow || ''}
                  onChange={e => handleEditModel(idx, 'contextWindow', parseInt(e.target.value) || 0)}
                  min="0"
                  step="1000"
                />
              </td>
              <td>
                <input
                  className="input input-bordered input-sm w-24"
                  type="number"
                  value={model.maxTokens || ''}
                  onChange={e => handleEditModel(idx, 'maxTokens', parseInt(e.target.value) || 0)}
                  min="0"
                  step="256"
                />
              </td>
              <td>
                <button className="btn btn-sm btn-error" onClick={() => handleRemoveModel(model.id)}>Delete</button>
              </td>
            </tr>
          ))}
          <tr>
            <td>
              <input
                className="input input-bordered input-sm w-full"
                value={newModel.id}
                onChange={e => setNewModel({ ...newModel, id: e.target.value })}
                placeholder="Model ID"
              />
            </td>
            <td>
              <input
                className="input input-bordered input-sm w-full"
                value={newModel.name}
                onChange={e => setNewModel({ ...newModel, name: e.target.value })}
                placeholder="Model Name"
              />
            </td>
            <td>
              <input
                type="checkbox"
                checked={!!newModel.isReasoningModel}
                onChange={e => setNewModel({ ...newModel, isReasoningModel: e.target.checked })}
              />
            </td>
            <td>
              <input
                className="input input-bordered input-sm w-24"
                type="number"
                value={newModel.contextWindow || ''}
                onChange={e => setNewModel({ ...newModel, contextWindow: parseInt(e.target.value) || 0 })}
                placeholder="64000"
                min="0"
                step="1000"
              />
            </td>
            <td>
              <input
                className="input input-bordered input-sm w-24"
                type="number"
                value={newModel.maxTokens || ''}
                onChange={e => setNewModel({ ...newModel, maxTokens: parseInt(e.target.value) || 0 })}
                placeholder="4096"
                min="0"
                step="256"
              />
            </td>
            <td>
              <button className="btn btn-sm btn-primary" onClick={handleAddModel}>Add</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="text-xs text-gray-500 mt-1">
        <p>Context Window: total tokens (input + output) the model can process. Max Tokens: max tokens the model can generate in a response.</p>
      </div>
    </div>
  );
}
