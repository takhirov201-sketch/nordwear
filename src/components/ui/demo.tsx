import { User } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export default function DemoOne() {
  return (
    <div className="font-medium">
      <Select>
        <SelectTrigger icon={User}>
          <SelectValue placeholder="Select a user" />
        </SelectTrigger>
        <SelectContent className="font-medium">
          <SelectItem value="john" icon={User}>
            John Doe
          </SelectItem>
          <SelectItem value="jane" icon={User}>
            Jane Smith
          </SelectItem>
          <SelectItem value="bob" icon={User}>
            Bob Johnson
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
