import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import React from "react";
import { cx } from "~/utils/helpers/cx";
import { Button } from "./button";
import { InputComposer, type InputProps } from "./input";
import { Label } from "./label";
import { Popover } from "./popover";

type Unit = "px" | "rem" | "em" | "%" | "vh" | "vw";

const UNITS: Unit[] = ["px", "rem", "em", "%", "vh", "vw"];

type CounterInputProps = Omit<InputProps, "onChange"> & {
  label?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: Unit;
  showUnitSelector?: boolean;
  className?: string;
};

export function CounterInput({
  className,
  onChange,
  defaultValue = "0",
  label,
  unit = "px",
  showUnitSelector = true,
  step = 1,
  ...props
}: CounterInputProps) {
  const [currentUnit, setCurrentUnit] = React.useState<Unit>(unit);
  const [value, setValue] = React.useState(defaultValue);

  const handleValueChange = (newValue: string) => {
    // Remove any non-numeric characters except decimal point
    const numericValue = newValue.replace(/[^\d.-]/g, "");

    if (numericValue === "") {
      setValue("");
      onChange?.("");
      return;
    }

    const numValue = Number.parseFloat(numericValue);
    if (Number.isNaN(numValue)) return;

    // Apply min/max constraints
    if (props.min !== undefined && numValue < props.min) return;
    if (props.max !== undefined && numValue > props.max) return;

    const formattedValue = `${numericValue}${
      showUnitSelector ? currentUnit : ""
    }`;
    setValue(formattedValue);
    onChange?.(formattedValue);
  };

  const increment = () => {
    const currentValue = Number.parseFloat(value) || 0;
    const newValue = currentValue + step;
    if (props.max !== undefined && newValue > props.max) return;
    handleValueChange(newValue.toString());
  };

  const decrement = () => {
    const currentValue = Number.parseFloat(value) || 0;
    const newValue = currentValue - step;
    if (props.min !== undefined && newValue < props.min) return;
    handleValueChange(newValue.toString());
  };

  const handleUnitChange = (newUnit: Unit) => {
    setCurrentUnit(newUnit);
    const numericValue = value.replace(/[^\d.-]/g, "");
    handleValueChange(`${numericValue}${newUnit}`);
  };

  return (
    <div className={cx("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <InputComposer className={cx("h-[40px] w-[120px]", className)}>
        <InputComposer.Input
          {...props}
          value={value}
          onChange={(e) => handleValueChange(e.target.value)}
          className="pr-8"
        />
        <div className="flex flex-col space-y-px">
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0"
            onClick={increment}
            disabled={props.disabled}
            type="button"
          >
            <ChevronUpIcon className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0"
            onClick={decrement}
            disabled={props.disabled}
            type="button"
          >
            <ChevronDownIcon className="h-3 w-3" />
          </Button>
        </div>
        {showUnitSelector && (
          <Popover>
            <Popover.Trigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={props.disabled}
              >
                {currentUnit}
              </Button>
            </Popover.Trigger>
            <Popover.Content className="w-16 p-1">
              <div className="grid grid-cols-2 gap-1">
                {UNITS.map((unit) => (
                  <Button
                    key={unit}
                    variant={currentUnit === unit ? "default" : "ghost"}
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => handleUnitChange(unit)}
                    disabled={props.disabled}
                  >
                    {unit}
                  </Button>
                ))}
              </div>
            </Popover.Content>
          </Popover>
        )}
      </InputComposer>
    </div>
  );
}
