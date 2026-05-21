import { useState } from 'react';
import styles from './InputFormBuilder.module.css';

export default function InputFormBuilder({ schema = [], values = {}, onChange, onRun }) {
  const [expanded, setExpanded] = useState({});
  const [tempNum, setTempNum] = useState({});
  const [jsonErrors, setJsonErrors] = useState({});

  if (!schema || schema.length === 0) {
    return (
      <div className={styles.empty}>
        No inputs detected. Edit code to set parameters.
      </div>
    );
  }

  const handleChange = (key, value) => {
    onChange({ ...values, [key]: value });
  };

  const addToArray = (key) => {
    const num = parseFloat(tempNum[key] || 0);
    const current = Array.isArray(values[key]) ? values[key] : [];
    handleChange(key, [...current, num]);
    setTempNum({ ...tempNum, [key]: '' });
  };

  const pasteToArray = (key, text) => {
    try {
      const nums = text.split(/[,\s\n]+/).filter(x => x.trim()).map(x => parseFloat(x)).filter(x => !isNaN(x));
      if (nums.length > 0) {
        const current = Array.isArray(values[key]) ? values[key] : [];
        handleChange(key, [...current, ...nums]);
        setTempNum({ ...tempNum, [key]: '' });
      }
    } catch (e) {
      // fail silently
    }
  };

  const removeFromArray = (key, index) => {
    const current = Array.isArray(values[key]) ? values[key] : [];
    handleChange(key, current.filter((_, i) => i !== index));
  };

  const clearArray = (key) => {
    handleChange(key, []);
  };

  const toggleExpanded = (key) => {
    setExpanded({ ...expanded, [key]: !expanded[key] });
  };

  const isExpanded = (key) => expanded[key] || false;

  const validateJson = (jsonStr) => {
    try {
      JSON.parse(jsonStr);
      return null;
    } catch (e) {
      return e.message;
    }
  };

  const formatValue = (val, type) => {
    if (type === 'array-num' && Array.isArray(val)) {
      return `[ ${val.slice(0, 3).join(', ')}${val.length > 3 ? '...' : ''} ]`;
    }
    if (type === 'object' && typeof val === 'object' && val !== null) {
      const keys = Object.keys(val).slice(0, 2);
      return `{ ${keys.join(', ')}${Object.keys(val).length > 2 ? '...' : ''} }`;
    }
    if (type === 'matrix' && Array.isArray(val)) {
      return `${val.length}×${val[0]?.length || 0}`;
    }
    return String(val);
  };

  return (
    <div className={styles.container}>
      <div className={styles.inputsBar}>
        {schema.map((field) => {
          const val = values[field.key];
          const displayVal = val !== undefined ? val : field.default;
          const isExp = isExpanded(field.key);

          return (
            <div key={field.key} className={`${styles.inputControl} ${isExp ? styles.expanded : ''}`}>
              <div className={styles.controlHeader} onClick={() => toggleExpanded(field.key)}>
                <span className={styles.controlLabel}>{field.label}</span>
                <span className={styles.controlValue}>
                  {formatValue(displayVal, field.type)}
                </span>
                {isExp && <span className={styles.expandIcon}>▼</span>}
                {!isExp && <span className={styles.expandIcon}>▶</span>}
              </div>

              {isExp && (
                <div className={styles.controlPanel}>
                  {field.type === 'array-num' && (
                    <div className={styles.arrayPanel}>
                      <div className={styles.arrayBuilder}>
                        <input
                          type="text"
                          className={styles.numInput}
                          value={tempNum[field.key] || ''}
                          onChange={(e) => setTempNum({ ...tempNum, [field.key]: e.target.value })}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') addToArray(field.key);
                          }}
                          onPaste={(e) => {
                            const text = e.clipboardData.getData('text');
                            e.preventDefault();
                            pasteToArray(field.key, text);
                          }}
                          placeholder="Enter number or paste: 1,2,3 or 1 2 3"
                          autoFocus
                        />
                        <button className={styles.addBtn} onClick={() => addToArray(field.key)}>
                          +
                        </button>
                      </div>

                      <div className={styles.arrayItems}>
                        {Array.isArray(displayVal) && displayVal.map((item, i) => (
                          <div key={i} className={styles.arrayTag}>
                            <span>{item}</span>
                            <button className={styles.removeBtn} onClick={() => removeFromArray(field.key, i)}>
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className={styles.arrayHint}>
                        Tip: paste comma/space separated values
                      </div>

                      {Array.isArray(displayVal) && displayVal.length > 0 && (
                        <button className={styles.clearBtn} onClick={() => clearArray(field.key)}>
                          Clear
                        </button>
                      )}
                    </div>
                  )}

                  {field.type === 'text' && (
                    <input
                      type="text"
                      className={styles.textInput}
                      value={displayVal || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder="Enter text"
                      autoFocus
                    />
                  )}

                  {field.type === 'number' && (
                    <input
                      type="number"
                      className={styles.numInput}
                      value={displayVal ?? 0}
                      onChange={(e) => handleChange(field.key, Number(e.target.value))}
                      autoFocus
                    />
                  )}

                  {field.type === 'boolean' && (
                    <select
                      className={styles.selectInput}
                      value={displayVal ? 'true' : 'false'}
                      onChange={(e) => handleChange(field.key, e.target.value === 'true')}
                      autoFocus
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  )}

                  {field.type === 'object' && (
                    <div className={styles.jsonPanel}>
                      <textarea
                        className={`${styles.jsonInput} ${jsonErrors[field.key] ? styles.jsonError : ''}`}
                        value={typeof displayVal === 'object' ? JSON.stringify(displayVal, null, 2) : String(displayVal)}
                        onChange={(e) => {
                          const error = validateJson(e.target.value);
                          setJsonErrors({ ...jsonErrors, [field.key]: error });
                          if (!error) {
                            try {
                              handleChange(field.key, JSON.parse(e.target.value));
                            } catch (e) {
                              setJsonErrors({ ...jsonErrors, [field.key]: e.message });
                            }
                          }
                        }}
                        placeholder='{"key": "value"}'
                        autoFocus
                      />
                      {jsonErrors[field.key] && (
                        <div className={styles.jsonErrorMsg}>
                          {jsonErrors[field.key]}
                        </div>
                      )}
                    </div>
                  )}

                  {field.type === 'matrix' && (
                    <div className={styles.jsonPanel}>
                      <textarea
                        className={`${styles.jsonInput} ${jsonErrors[field.key] ? styles.jsonError : ''}`}
                        value={Array.isArray(displayVal) ? JSON.stringify(displayVal, null, 2) : '[[0]]'}
                        onChange={(e) => {
                          const error = validateJson(e.target.value);
                          setJsonErrors({ ...jsonErrors, [field.key]: error });
                          if (!error) {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              if (Array.isArray(parsed)) handleChange(field.key, parsed);
                            } catch (e) {
                              setJsonErrors({ ...jsonErrors, [field.key]: e.message });
                            }
                          }
                        }}
                        placeholder='[[0, 1], [2, 3]]'
                        autoFocus
                      />
                      {jsonErrors[field.key] && (
                        <div className={styles.jsonErrorMsg}>
                          {jsonErrors[field.key]}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className={styles.runBtn} onClick={onRun}>
        ▶ Run
      </button>
    </div>
  );
}
