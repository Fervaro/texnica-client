import React, { useMemo } from 'react';
import { Autocomplete, TextField, Box, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { SelectOption } from '../types';

/**
 * Opción sintética que representa "+ Agregar nuevo «X»".
 * No crea nada: al seleccionarla se delega en `onAddNew`, que navega
 * al módulo del catálogo para completar el alta con todos sus campos.
 */
interface AddOption {
  __add: true;
  label: string;
}

type CatalogOption = SelectOption | AddOption;

const isAddOption = (option: CatalogOption): option is AddOption =>
  (option as AddOption).__add === true;

/** Normaliza para comparar sin distinguir mayúsculas/minúsculas ni espacios extremos */
const normalize = (value: string) => (value ?? '').trim().toLowerCase();

export interface CatalogAutocompleteProps {
  /** Etiqueta del campo */
  label: string;
  /** Valor actual (texto guardado en el formulario) */
  value: string;
  /** Opciones del catálogo (todas las activas) */
  options: SelectOption[];
  /** Se dispara al seleccionar un registro existente */
  onChange: (value: string) => void;
  /** Nombre del catálogo para el texto "+ Agregar nuevo {entity} «X»" (ej. "Style") */
  addNewEntityLabel: string;
  /**
   * Se dispara al elegir la opción "+ Agregar nuevo ...".
   * No crea el registro: normalmente navega al módulo del catálogo.
   */
  onAddNew: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  /** Texto de ayuda que se muestra cuando no hay error */
  helperText?: React.ReactNode;
  placeholder?: string;
}

/**
 * Select con búsqueda dinámica (autocompletado) para catálogos maestros.
 *
 * Comportamiento:
 *  - Filtra las opciones conforme el usuario escribe (case-insensitive).
 *  - Ordena alfabética/numéricamente los resultados.
 *  - Si el texto no coincide con ningún registro, muestra al final la opción
 *    `+ Agregar nuevo "X"`, que **no** crea el registro: navega al módulo
 *    del catálogo para que el usuario complete el formulario completo.
 *  - Reutiliza MUI Autocomplete (dependencia ya presente en el proyecto).
 */
const CatalogAutocomplete: React.FC<CatalogAutocompleteProps> = ({
  label,
  value,
  options,
  onChange,
  addNewEntityLabel,
  onAddNew,
  required,
  disabled,
  helperText,
  placeholder,
}) => {

  // Resultados ordenados alfabética y numéricamente (B1001 < B1002 < B2002)
  const sortedOptions = useMemo(
    () =>
      [...options].sort((a, b) =>
        (a.label ?? '').localeCompare(b.label ?? '', undefined, { numeric: true, sensitivity: 'base' }),
      ),
    [options],
  );

  // Opción seleccionada. Si el valor guardado no existe en el catálogo
  // (por ejemplo un valor histórico "(previo)"), se muestra igualmente.
  const selectedOption = useMemo<CatalogOption | null>(() => {
    const v = normalize(value);
    if (!v) return null;
    return sortedOptions.find(o => normalize(o.label) === v) ?? { id: -1, label: value.trim() };
  }, [value, sortedOptions]);

  // Filtro dinámico + opción de alta cuando no hay coincidencia exacta
  const filterOptions = (opts: SelectOption[], state: { inputValue: string }): CatalogOption[] => {
    const term = normalize(state.inputValue);
    const filtered = term ? opts.filter(o => normalize(o.label).includes(term)) : opts;
    const exactMatch = opts.some(o => normalize(o.label) === term);
    if (term && !exactMatch) {
      return [...filtered, { __add: true, label: state.inputValue.trim() }];
    }
    return filtered;
  };

  return (
    <Autocomplete<CatalogOption, false, false, false>
      size="small"
      disabled={disabled}
      options={sortedOptions as CatalogOption[]}
      value={selectedOption}
      autoHighlight
      autoSelect
      handleHomeEndKeys
      clearOnBlur={false}
      filterOptions={filterOptions as any}
      isOptionEqualToValue={(o, v) => normalize((o as any).label) === normalize((v as any).label)}
      getOptionLabel={(o) => (typeof o === 'string' ? o : o.label ?? '')}
      onChange={(_e, newValue) => {
        if (!newValue) { onChange(''); return; }
        if (isAddOption(newValue)) { onAddNew(newValue.label.trim()); return; }
        onChange(newValue.label);
      }}
      renderOption={(props, option) => {
        const { key, ...rest } = props as any;
        if (isAddOption(option)) {
          return (
            <Box
              component="li"
              key={key}
              {...rest}
              sx={{ color: 'primary.main', fontWeight: 600, display: 'flex', alignItems: 'center' }}
            >
              <AddIcon fontSize="small" sx={{ mr: 1 }} />
              {`Agregar nuevo ${addNewEntityLabel} "${option.label}"`}
            </Box>
          );
        }
        const opt = option as SelectOption;
        return (
          <Box component="li" key={key} {...rest}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2">{opt.label}</Typography>
              {opt.sub ? (
                <Typography variant="caption" sx={{ opacity: 0.7 }}>{opt.sub}</Typography>
              ) : null}
            </Box>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          placeholder={placeholder}
          helperText={helperText}
        />
      )}
    />
  );
};

export default CatalogAutocomplete;
