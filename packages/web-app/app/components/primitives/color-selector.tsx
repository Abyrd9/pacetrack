import * as React from "react";
import { cx } from "~/utils/helpers/cx";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Popover } from "./popover";
import { ScrollArea } from "./scrollarea";
import { Separator } from "./separator";

const PRESET_COLORS = [
  "#000000",
  "#1a1a1a",
  "#333333",
  "#4d4d4d",
  "#666666",
  "#808080",
  "#999999",
  "#b3b3b3",
  "#cccccc",
  "#e6e6e6",
  "#ffffff",
  "#ff0000",
  "#ff3333",
  "#ff6666",
  "#ff9999",
  "#ffcccc",
  "#ffe6e6",
  "#ff9900",
  "#ffad33",
  "#ffc266",
  "#ffd699",
  "#ffebcc",
  "#fff5e6",
  "#ffff00",
  "#ffff33",
  "#ffff66",
  "#ffff99",
  "#ffffcc",
  "#ffffe6",
  "#00ff00",
  "#33ff33",
  "#66ff66",
  "#99ff99",
  "#ccffcc",
  "#e6ffe6",
  "#00ffff",
  "#33ffff",
  "#66ffff",
  "#99ffff",
  "#ccffff",
  "#e6ffff",
  "#0000ff",
  "#3333ff",
  "#6666ff",
  "#9999ff",
  "#ccccff",
  "#e6e6ff",
  "#9900ff",
  "#ad33ff",
  "#c266ff",
  "#d699ff",
  "#ebccff",
  "#f5e6ff",
  "#ff00ff",
  "#ff33ff",
  "#ff66ff",
  "#ff99ff",
  "#ffccff",
  "#ffe6ff",
];

type ColorSelectorProps = {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
};

export function ColorSelector({
  value,
  onChange,
  label,
  className,
  disabled,
}: ColorSelectorProps) {
  const [inputValue, setInputValue] = React.useState(value);
  const [isValid, setIsValid] = React.useState(true);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Check if it's a valid hex color
    const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newValue);
    setIsValid(isValidHex);

    if (isValidHex) {
      onChange(newValue);
    }
  };

  const handlePresetClick = (color: string) => {
    setInputValue(color);
    onChange(color);
  };

  return (
    <div className={cx("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        <Popover>
          <Popover.Trigger asChild>
            <Button
              variant="outline"
              className="h-10 w-10 p-0"
              style={{ backgroundColor: value }}
              disabled={disabled}
            />
          </Popover.Trigger>
          <Popover.Content className="w-64 p-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Custom Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={value}
                    onChange={(e) => {
                      const newColor = e.target.value;
                      setInputValue(newColor);
                      onChange(newColor);
                    }}
                    className="h-10 w-10 p-0"
                    disabled={disabled}
                  />
                  <Input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    className={cx(
                      "flex-1",
                      !isValid && "border-red-500 focus-visible:ring-red-500"
                    )}
                    placeholder="#000000"
                    disabled={disabled}
                  />
                </div>
                {!isValid && (
                  <p className="text-sm text-red-500">Invalid hex color</p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Preset Colors</Label>
                <ScrollArea className="h-32">
                  <div className="grid grid-cols-6 gap-2 p-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={cx(
                          "h-6 w-6 rounded-sm transition-transform hover:scale-110",
                          value === color &&
                            "ring-2 ring-offset-2 ring-offset-background-500 ring-primary-500"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => handlePresetClick(color)}
                        disabled={disabled}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </Popover.Content>
        </Popover>
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          className={cx(
            "flex-1",
            !isValid && "border-red-500 focus-visible:ring-red-500"
          )}
          placeholder="#000000"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
