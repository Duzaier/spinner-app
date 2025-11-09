// RiggedSpinnerApp.jsx
import React, { useState, useRef, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
    Container,
    Row,
    Col,
    Button,
    Card,
    Modal,
    Form,
} from "react-bootstrap";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

export default function RiggedSpinnerApp() {
    // --- CONFIG ---
    const wheelSize = 720;
    const defaultNames = [
        "🍎 Apple",
        "🍌 Banana",
        "🍒 Cherry",
        "🍇 Grape",
        "🍉 Watermelon",
        "🥝 Kiwi",
    ];
    // -------------
    const [namesInput, setNamesInput] = useState(defaultNames.join("\n"));
    const [names, setNames] = useState(defaultNames);
    const [riggedSequenceInput] = useState("");
    const riggedSequence = riggedSequenceInput
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

    const canvasRef = useRef(null);
    const wheelRef = useRef(null);
    const spinTimeoutRef = useRef(null);
    const modalTimeoutRef = useRef(null);

    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [spinCount, setSpinCount] = useState(0);

    // eslint-disable-next-line no-unused-vars
    const total = names.length || 1;
    useEffect(() => {
        void total;
    }, [total]);


    // Prevent body scroll while spinning
    useEffect(() => {
        document.body.style.overflow = spinning ? "hidden" : "";
        return () => (document.body.style.overflow = "");
    }, [spinning]);

    // Draw wheel (canvas)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const num = names.length;
        const size = canvas.width;
        const r = size / 2;

        ctx.clearRect(0, 0, size, size);
        if (num === 0) return;

        const arc = (2 * Math.PI) / num;
        const hueFor = (i) => (i * 360) / Math.max(num, 12);

        for (let i = 0; i < num; i++) {
            const start = i * arc;
            const end = start + arc;

            // Segment background
            ctx.beginPath();
            ctx.moveTo(r, r);
            ctx.arc(r, r, r, start, end);
            ctx.closePath();
            ctx.fillStyle = `hsl(${hueFor(i)}, 70%, 80%)`;
            ctx.fill();

            ctx.strokeStyle = "rgba(255,255,255,0.3)";
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Label
            ctx.save();
            ctx.translate(r, r);
            ctx.rotate(start + arc / 2);
            ctx.textAlign = "right";
            ctx.fillStyle = "#222";
            ctx.font = `bold ${Math.max(10, Math.round(size / 60))}px 'Poppins', sans-serif`;
            const text = names[i].length > 24 ? names[i].slice(0, 24) + "..." : names[i];
            ctx.fillText(text, r - 15, 5);
            ctx.restore();
        }

        // Inner circle (hub)
        ctx.beginPath();
        ctx.arc(r, r, Math.max(40, size * 0.06), 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.stroke();

        ctx.fillStyle = "#111";
        ctx.font = `${Math.max(12, Math.round(size / 40))}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GO", r, r);
    }, [names, wheelSize]);

    // Rigged/random picker
    function pickIndexByRigOrRandom() {
        if (spinCount < riggedSequence.length) {
            const want = riggedSequence[spinCount];
            let idx = names.findIndex((n) => n === want);
            if (idx === -1)
                idx = names.findIndex((n) =>
                    n.toLowerCase().includes(want.toLowerCase())
                );
            if (idx !== -1) return idx;
        }
        return Math.floor(Math.random() * names.length);
    }

    function spin() {
        if (spinning || names.length === 0) return;
        setResult(null);
        setShowModal(false);
        const chosenIndex = pickIndexByRigOrRandom();
        spinToIndex(chosenIndex);
    }

    // -----------------------
    // UPDATED spinToIndex
    // -----------------------
    function spinToIndex(index) {
        if (spinning || names.length === 0) return;
        setSpinning(true);
        setResult(null);
        setShowModal(false);

        const sliceAngle = 360 / names.length;
        const centerDeg = index * sliceAngle + sliceAngle / 2;
        const extraSpins = 4 + Math.floor(Math.random() * 2); // 4–5 vòng
        let finalDeg = 360 * extraSpins + (270 - centerDeg);
        finalDeg = finalDeg + (Math.floor(Math.abs(finalDeg) / 360) + 1) * 360;

        const el = wheelRef.current;
        if (!el) {
            finishSpinFromNormalized(finalDeg % 360);
            return;
        }

        // 🕒 Tăng thời gian quay lên 6s + easing mượt
        el.style.transition = "transform 6s cubic-bezier(.08,.77,.38,1)";
        el.style.transform = `rotate(${finalDeg}deg)`;

        if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = setTimeout(() => {
            el.style.transition = "none";
            const normalized = finalDeg % 360;
            el.style.transform = `rotate(${normalized}deg)`;
            finishSpinFromNormalized(normalized);
        }, 6100); // tăng timeout tương ứng
    }

    // -----------------------
    // End spinToIndex
    // -----------------------

    function finishSpinFromNormalized(normalizedAngle) {
        const sliceAngle = 360 / names.length;
        const angleInWheelCoords = (270 - normalizedAngle + 360) % 360;
        const index = Math.floor(angleInWheelCoords / sliceAngle) % names.length;
        const picked = names[Math.max(0, Math.min(index, names.length - 1))];

        setResult(picked);

        try {
            confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        } catch (e) { }

        setSpinning(false);
        setSpinCount((c) => c + 1);

        if (modalTimeoutRef.current) clearTimeout(modalTimeoutRef.current);
        modalTimeoutRef.current = setTimeout(() => setShowModal(true), 1400);
    }

    function handleApplyNames() {
        const list = namesInput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (list.length === 0) return;
        setNames(list);
        setSpinCount(0);
        setResult(null);
        setShowModal(false);
        if (wheelRef.current) {
            wheelRef.current.style.transition = "none";
            wheelRef.current.style.transform = "rotate(0deg)";
        }
    }

    useEffect(() => {
        return () => {
            if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
            if (modalTimeoutRef.current) clearTimeout(modalTimeoutRef.current);
        };
    }, []);

    return (
        <Container fluid className="py-4">
            <Row className="g-4 align-items-start">
                {/* LEFT PANEL */}
                <Col md={4}>
                    <Card
                        className="p-3"
                        style={{
                            background: "linear-gradient(135deg,#0ea5e9 0%, #7c3aed 100%)",
                            color: "white",
                            border: "none",
                            boxShadow: "0 8px 30px rgba(124,58,237,0.18)",
                        }}
                    >
                        <h5 className="mb-2 fw-bold">🎯 Danh sách quay</h5>
                        <Form.Control
                            as="textarea"
                            rows={8}
                            value={namesInput}
                            onChange={(e) => setNamesInput(e.target.value)}
                            style={{
                                resize: "vertical",
                                background: "rgba(255,255,255,0.08)",
                                color: "white",
                                border: "1px solid rgba(255,255,255,0.08)",
                            }}
                        />
                        <div className="d-flex gap-2 mt-3">
                            <Button className="btn btn-light flex-grow-1" onClick={handleApplyNames}>
                                Áp dụng
                            </Button>
                            <Button
                                className="btn btn-outline-light"
                                onClick={() => {
                                    setNamesInput(defaultNames.join("\n"));
                                    setNames(defaultNames);
                                }}
                            >
                                Reset mẫu
                            </Button>
                        </div>
                    </Card>
                </Col>

                {/* RIGHT WHEEL */}
                <Col md={8}>
                    <Card className="p-3" style={{ border: "none", boxShadow: "0 10px 30px rgba(2,6,23,0.06)" }}>
                        <div className="d-flex justify-content-between align-items-center">
                            <h4>🎡 Spinner</h4>
                            <div className="d-flex gap-2">
                                <Button
                                    variant="outline-secondary"
                                    onClick={() => {
                                        if (wheelRef.current) {
                                            wheelRef.current.style.transition = "none";
                                            wheelRef.current.style.transform = "rotate(0deg)";
                                        }
                                        setSpinCount(0);
                                        setResult(null);
                                        setShowModal(false);
                                    }}
                                >
                                    Reset
                                </Button>
                                <Button onClick={spin} disabled={spinning || names.length === 0}>
                                    {spinning ? "Đang quay..." : "Quay ngay"}
                                </Button>
                            </div>
                        </div>

                        <div style={{ position: "relative", paddingTop: 20 }}>
                            <div
                                ref={wheelRef}
                                style={{
                                    width: wheelSize,
                                    height: wheelSize,
                                    margin: "18px auto",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <canvas
                                    ref={canvasRef}
                                    width={wheelSize}
                                    height={wheelSize}
                                    style={{
                                        borderRadius: "50%",
                                        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                                        background: "#fff",
                                    }}
                                />
                            </div>

                            {/* Pointer */}
                            <div
                                style={{
                                    position: "absolute",
                                    left: "50%",
                                    top: `calc(50% - ${wheelSize / 2}px - 2px)`,
                                    transform: "translateX(-50%) rotate(180deg)",
                                    zIndex: 100,
                                    pointerEvents: "none",
                                }}
                            >
                                <div
                                    style={{
                                        width: 0,
                                        height: 0,
                                        borderLeft: "16px solid transparent",
                                        borderRight: "16px solid transparent",
                                        borderBottom: "24px solid #222",
                                    }}
                                />
                            </div>
                        </div>

                        {result && (
                            <div style={{ marginTop: 16, textAlign: "center" }}>
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <strong style={{ fontSize: 20 }}>Kết quả:</strong>
                                    <span style={{ fontWeight: 800, marginLeft: 8 }}>{result}</span>
                                </motion.div>
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>🎉 Chúc mừng!</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center">
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }}>
                        <h2 style={{ fontSize: 26, marginBottom: 8 }}>{result}</h2>
                        <p>Bạn có muốn giữ lại hoặc loại bỏ tên này khỏi danh sách?</p>
                        <div className="d-flex gap-2 justify-content-center">
                            <Button variant="success" onClick={() => setShowModal(false)}>
                                Giữ lại
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => {
                                    setNames((prev) => prev.filter((n) => n !== result));
                                    setShowModal(false);
                                    setResult(null);
                                }}
                            >
                                Loại bỏ
                            </Button>
                        </div>
                    </motion.div>
                </Modal.Body>
            </Modal>
        </Container>
    );
}
