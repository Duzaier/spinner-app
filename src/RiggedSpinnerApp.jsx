import React, { useState, useRef, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
    Container,
    Row,
    Col,
    Button,
    Card,
    Form,
} from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import confetti from "canvas-confetti";

/* 🔊 Hook xử lý âm thanh — nhạc xổ số Việt Nam */
const useSound = () => {
    const spinAudio = useRef(null);
    const winAudio = useRef(null);

    useEffect(() => {
        spinAudio.current = new Audio(process.env.PUBLIC_URL + "/sounds/spin-lottery.mp3");
        spinAudio.current.volume = 0.7;
        winAudio.current = new Audio(process.env.PUBLIC_URL + "/sounds/win.mp3");
        winAudio.current.volume = 0.9;
    }, []);

    const playSpin = () => {
        if (spinAudio.current) {
            spinAudio.current.currentTime = 0;
            spinAudio.current.play().catch(() => { });
        }
    };

    const stopSpin = () => {
        if (spinAudio.current) {
            spinAudio.current.pause();
            spinAudio.current.currentTime = 0;
        }
    };

    const playWin = () => {
        if (winAudio.current) {
            winAudio.current.currentTime = 0;
            winAudio.current.play().catch(() => { });
        }
    };

    return { playSpin, stopSpin, playWin };
};

export default function RiggedSpinnerApp() {
    const { playSpin, stopSpin, playWin } = useSound();

    const [wheelSize, setWheelSize] = useState(720);
    const defaultNames = ["🍎 Apple", "🍌 Banana", "🍒 Cherry", "🍇 Grape", "🍉 Watermelon", "🥝 Kiwi"];
    const [namesInput, setNamesInput] = useState(defaultNames.join("\n"));
    const [names, setNames] = useState(defaultNames);
    const [riggedSequenceInput, setRiggedSequenceInput] = useState("");
    const [prevRiggedSequence, setPrevRiggedSequence] = useState([]);
    const [recentAddedName, setRecentAddedName] = useState(null);

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
    const [showAdmin, setShowAdmin] = useState(false);

    // Giữ eslint hài lòng
    useEffect(() => {
        const total = names.length || 1;
        void total;
    }, [names]);

    useEffect(() => {
        const newSeq = riggedSequence;
        if (JSON.stringify(newSeq) !== JSON.stringify(prevRiggedSequence)) {
            setSpinCount(0);
            const newAdded = newSeq.find((item) => !prevRiggedSequence.includes(item));
            if (newAdded) setRecentAddedName(newAdded);
            setPrevRiggedSequence(newSeq);
        }
    }, [riggedSequenceInput]);

    useEffect(() => {
        const updateSize = () => {
            const width = window.innerWidth;
            if (width < 500) setWheelSize(260);
            else if (width < 768) setWheelSize(360);
            else if (width < 1024) setWheelSize(480);
            else setWheelSize(720);
        };
        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

    useEffect(() => {
        document.body.style.overflow = spinning ? "hidden" : "";
        return () => (document.body.style.overflow = "");
    }, [spinning]);

    // Vẽ bánh xe
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
            ctx.beginPath();
            ctx.moveTo(r, r);
            ctx.arc(r, r, r, start, end);
            ctx.closePath();
            ctx.fillStyle = `hsl(${hueFor(i)}, 70%, 80%)`;
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.3)";
            ctx.lineWidth = 0.8;
            ctx.stroke();
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

    // --- QUAY ---
    function pickIndexByRigOrRandom() {
        if (recentAddedName) {
            const idx = names.findIndex((n) => n.toLowerCase() === recentAddedName.toLowerCase());
            if (idx !== -1) {
                setRecentAddedName(null);
                return idx;
            }
        }
        if (spinCount < riggedSequence.length) {
            const want = riggedSequence[spinCount];
            let idx = names.findIndex((n) => n === want);
            if (idx === -1) idx = names.findIndex((n) => n.toLowerCase().includes(want.toLowerCase()));
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

    function spinToIndex(index) {
        if (spinning || names.length === 0) return;
        setSpinning(true);
        setResult(null);
        setShowModal(false);
        playSpin();

        const sliceAngle = 360 / names.length;
        const centerDeg = index * sliceAngle + sliceAngle / 2;
        const extraSpins = 4 + Math.floor(Math.random() * 2);
        let finalDeg = 360 * extraSpins + (270 - centerDeg);
        finalDeg = finalDeg + (Math.floor(Math.abs(finalDeg) / 360) + 1) * 360;

        const el = wheelRef.current;
        const duration = 10;
        if (!el) {
            finishSpinFromNormalized(finalDeg % 360);
            return;
        }

        el.style.transition = `transform ${duration}s cubic-bezier(.08,.77,.38,1)`;
        el.style.transform = `rotate(${finalDeg}deg)`;

        if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = setTimeout(() => {
            el.style.transition = "none";
            const normalized = finalDeg % 360;
            el.style.transform = `rotate(${normalized}deg)`;
            stopSpin();
            finishSpinFromNormalized(normalized);
        }, duration * 1000 + 200);
    }

    function finishSpinFromNormalized(normalizedAngle) {
        const sliceAngle = 360 / names.length;
        const angleInWheelCoords = (270 - normalizedAngle + 360) % 360;
        const index = Math.floor(angleInWheelCoords / sliceAngle) % names.length;
        const picked = names[Math.max(0, Math.min(index, names.length - 1))];
        setResult(picked);
        playWin();
        confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
        setSpinning(false);
        setSpinCount((c) => c + 1);
        if (modalTimeoutRef.current) clearTimeout(modalTimeoutRef.current);
        modalTimeoutRef.current = setTimeout(() => setShowModal(true), 1500);
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

    // 🧩 Xóa người trúng khỏi danh sách
    function handleRemoveWinner() {
        if (!result) return;
        setNames((prev) => prev.filter((name) => name !== result));
        setNamesInput((prev) =>
            prev
                .split(/\r?\n/)
                .filter((line) => line.trim() !== result)
                .join("\n")
        );
        setResult(null);
        setShowModal(false);
    }

    // --- UI ---
    return (
        <>
            {/* Hiệu ứng nền mờ khi mở admin */}
            <AnimatePresence>
                {showAdmin && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.45 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            background: "black",
                            zIndex: 1500,
                            backdropFilter: "blur(4px)",
                        }}
                        onClick={() => setShowAdmin(false)}
                    />
                )}
            </AnimatePresence>

            <Container fluid className="py-4 px-3">
                <Row className="g-4 align-items-start flex-column flex-md-row">
                    <Col xs={12} md={4}>
                        <Card
                            className="p-3"
                            style={{
                                background: "linear-gradient(135deg,#0ea5e9,#7c3aed)",
                                color: "white",
                                border: "none",
                                boxShadow: "0 8px 30px rgba(124,58,237,0.18)",
                            }}
                        >
                            <h5 className="fw-bold text-center mb-2">Danh sách quay</h5>
                            <Form.Control
                                as="textarea"
                                rows={6}
                                value={namesInput}
                                onChange={(e) => setNamesInput(e.target.value)}
                                style={{
                                    resize: "vertical",
                                    background: "rgba(255,255,255,0.08)",
                                    color: "white",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                }}
                            />
                            <div className="d-flex gap-2 mt-3 flex-wrap">
                                <Button className="btn btn-light flex-grow-1" onClick={handleApplyNames}>
                                    Áp dụng
                                </Button>
                                <Button
                                    className="btn btn-outline-light flex-grow-1"
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

                    {/* Vòng quay */}
                    <Col xs={12} md={8}>
                        <Card
                            className="p-3"
                            style={{
                                border: "none",
                                boxShadow: "0 10px 30px rgba(2,6,23,0.06)",
                            }}
                        >
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                {/* 🧿 Logo + Tiêu đề */}
                                <div className="d-flex align-items-center gap-2">
                                    <motion.img
                                        src={process.env.PUBLIC_URL + "/logo.png"} // ⚠️ Bạn tự thêm logo.png vào /public
                                        alt="F-BIZ Logo"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5 }}
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: "8px",
                                            objectFit: "cover",
                                            boxShadow: "0 0 10px rgba(124,58,237,0.4)",
                                        }}
                                    />
                                    <h4
                                        className="m-0 fw-bold"
                                        style={{
                                            letterSpacing: "1px",
                                            color: "#0f172a",
                                            fontFamily: "'Poppins', sans-serif",
                                        }}
                                    >
                                        F-BIZ XỔ SỐ
                                    </h4>
                                </div>

                                <div className="d-flex gap-2">
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
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
                                    <Button size="sm" onClick={spin} disabled={spinning || names.length === 0}>
                                        {spinning ? "Đang quay..." : "Quay ngay"}
                                    </Button>
                                </div>
                            </div>

                            {/* Giữ nguyên phần bánh xe và kết quả ở dưới */}
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
                                            width: "100%",
                                        }}
                                    />
                                </div>
                                <div
                                    style={{
                                        position: "absolute",
                                        left: "50%",
                                        top: `calc(50% - ${wheelSize / 2}px - 2px)`,
                                        transform: "translateX(-50%) rotate(180deg)",
                                        zIndex: 100,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 0,
                                            height: 0,
                                            borderLeft: "12px solid transparent",
                                            borderRight: "12px solid transparent",
                                            borderBottom: "18px solid #222",
                                        }}
                                    />
                                </div>
                            </div>

                            {result && (
                                <div style={{ marginTop: 16, textAlign: "center" }}>
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                        transition={{ type: "spring", stiffness: 100, damping: 12 }}
                                        style={{
                                            background:
                                                "linear-gradient(135deg, rgba(124,58,237,0.9), rgba(14,165,233,0.9))",
                                            color: "white",
                                            padding: "12px 18px",
                                            borderRadius: "20px",
                                            display: "inline-block",
                                            boxShadow: "0 0 20px rgba(124,58,237,0.6)",
                                        }}
                                    >
                                        <strong style={{ fontSize: 18 }}>🎉 Kết quả:</strong>
                                        <span
                                            style={{
                                                fontWeight: 900,
                                                marginLeft: 10,
                                                textShadow: "0 0 6px rgba(255,255,255,0.9)",
                                            }}
                                        >
                                            {result}
                                        </span>
                                    </motion.div>
                                </div>
                            )}
                        </Card>
                    </Col>

                </Row>
            </Container>

            {/* Offcanvas Admin */}
            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: showAdmin ? 0 : "100%" }}
                transition={{ type: "spring", stiffness: 80, damping: 14 }}
                style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    height: "100vh",
                    width: "280px",
                    background: "linear-gradient(180deg,#1e293b,#0f172a)",
                    color: "white",
                    padding: "20px",
                    boxShadow: "-6px 0 20px rgba(0,0,0,0.3)",
                    zIndex: 2000,
                }}
            >
                <h5 className="mb-3 text-center">⚙️ Bảng điều khiển</h5>
                <Form.Group className="mb-3">
                    <Form.Label>Chuỗi quay cố định</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={4}
                        placeholder="Nhập thứ tự kết quả..."
                        value={riggedSequenceInput}
                        onChange={(e) => setRiggedSequenceInput(e.target.value)}
                        style={{
                            background: "rgba(255,255,255,0.1)",
                            color: "white",
                            border: "none",
                        }}
                    />
                </Form.Group>
                <Button variant="light" className="w-100 mt-2" onClick={() => setShowAdmin(false)}>
                    Đóng
                </Button>
            </motion.div>

            {/* Toggle Button */}
            <motion.button
                onClick={() => setShowAdmin((s) => !s)}
                style={{
                    position: "fixed",
                    right: showAdmin ? 290 : 20,
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 2100,
                    border: "none",
                    background: "linear-gradient(135deg,#7c3aed,#0ea5e9)",
                    color: "white",
                    borderRadius: "50%",
                    width: "46px",
                    height: "46px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                    cursor: "pointer",
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                {showAdmin ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
            </motion.button>

            {/* Modal Kết quả */}
            <AnimatePresence>
                {showModal && result && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            background: "rgba(0,0,0,0.6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 3000,
                        }}
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 30, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 110, damping: 12 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: "white",
                                padding: "28px 32px",
                                borderRadius: "18px",
                                textAlign: "center",
                                width: "min(90%, 400px)",
                                boxShadow: "0 6px 30px rgba(0,0,0,0.3)",
                            }}
                        >
                            <h4 className="fw-bold mb-3" style={{ color: "#7c3aed" }}>
                                🎉 KẾT QUẢ TRÚNG
                            </h4>
                            <h2
                                style={{
                                    color: "#0ea5e9",
                                    fontWeight: 900,
                                    textShadow: "0 0 10px rgba(14,165,233,0.6)",
                                    marginBottom: "24px",
                                }}
                            >
                                {result}
                            </h2>
                            <div className="d-flex justify-content-center gap-3">
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowModal(false)}
                                    style={{
                                        padding: "8px 18px",
                                        borderRadius: "10px",
                                    }}
                                >
                                    OK
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={handleRemoveWinner}
                                    style={{
                                        padding: "8px 18px",
                                        borderRadius: "10px",
                                    }}
                                >
                                    Bỏ người này
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
