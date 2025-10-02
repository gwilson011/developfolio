import * as React from "react";
import CircularProgress, {
    CircularProgressProps,
} from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

interface CircularProgressWithLabelProps extends CircularProgressProps {
    value: number;
    label?: React.ReactNode;
    showPercentage?: boolean;
    labelColor?: string;
    labelVariant?: "caption" | "body1" | "body2" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "subtitle1" | "subtitle2";
    labelClassName?: string;
}

function CircularProgressWithLabel({
    value,
    label,
    showPercentage = true,
    labelColor = "text.secondary",
    labelVariant = "caption",
    labelClassName,
    ...circularProgressProps
}: CircularProgressWithLabelProps) {
    const displayLabel = label !== undefined
        ? label
        : showPercentage
        ? `${Math.round(value)}%`
        : null;

    return (
        <Box sx={{ position: "relative", display: "inline-flex" }}>
            <CircularProgress variant="determinate" value={value} {...circularProgressProps} />
            {displayLabel !== null && (
                <Box
                    sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: "absolute",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {React.isValidElement(displayLabel) ? (
                        displayLabel
                    ) : typeof displayLabel === "string" || typeof displayLabel === "number" ? (
                        labelClassName ? (
                            <div className={labelClassName}>
                                {displayLabel}
                            </div>
                        ) : (
                            <Typography
                                variant={labelVariant}
                                component="div"
                                sx={{ color: labelColor }}
                            >
                                {displayLabel}
                            </Typography>
                        )
                    ) : (
                        displayLabel
                    )}
                </Box>
            )}
        </Box>
    );
}

export { CircularProgressWithLabel };

export default function CircularWithValueLabel() {
    const [progress, setProgress] = React.useState(10);

    React.useEffect(() => {
        const timer = setInterval(() => {
            setProgress((prevProgress) =>
                prevProgress >= 100 ? 0 : prevProgress + 10
            );
        }, 800);
        return () => {
            clearInterval(timer);
        };
    }, []);

    return <CircularProgressWithLabel value={progress} />;
}
