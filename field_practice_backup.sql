--
-- PostgreSQL database dump
--

\restrict 5aLYyixK4ehCh1bawSpP8jp7TIlLJwy3Qr8GvHyOtSrAbE4Oormj1t7vQlE6UbD

-- Dumped from database version 16.14 (Homebrew)
-- Dumped by pg_dump version 16.14 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_analyses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_analyses (
    id integer NOT NULL,
    observation_id integer NOT NULL,
    rock_name text,
    rock_type text,
    confidence text,
    structure text,
    mineral text,
    weathering text,
    formation_environment text,
    uncertainty text,
    suggestions text,
    student_report text,
    analysis_time timestamp without time zone,
    status character varying DEFAULT 'processing'::character varying NOT NULL
);


--
-- Name: ai_analyses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_analyses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_analyses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_analyses_id_seq OWNED BY public.ai_analyses.id;


--
-- Name: checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkins (
    id integer NOT NULL,
    student_id integer NOT NULL,
    checkin_time timestamp without time zone,
    point_id integer NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    status character varying
);


--
-- Name: checkins_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.checkins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: checkins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.checkins_id_seq OWNED BY public.checkins.id;


--
-- Name: course_students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_students (
    id integer NOT NULL,
    course_id integer,
    student_id integer
);


--
-- Name: course_students_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.course_students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: course_students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.course_students_id_seq OWNED BY public.course_students.id;


--
-- Name: course_teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_teachers (
    id integer NOT NULL,
    course_id integer NOT NULL,
    teacher_id integer NOT NULL
);


--
-- Name: course_teachers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.course_teachers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: course_teachers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.course_teachers_id_seq OWNED BY public.course_teachers.id;


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id integer NOT NULL,
    course_name character varying NOT NULL,
    course_description text,
    is_active boolean DEFAULT true
);


--
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.courses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.courses_id_seq OWNED BY public.courses.id;


--
-- Name: notification_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_reads (
    id integer NOT NULL,
    notification_id integer NOT NULL,
    student_id integer NOT NULL,
    read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: notification_reads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_reads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_reads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_reads_id_seq OWNED BY public.notification_reads.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    title character varying NOT NULL,
    content text NOT NULL,
    type character varying NOT NULL,
    course_id integer,
    route_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    student_id integer
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.observations (
    id integer NOT NULL,
    student_id integer NOT NULL,
    observation_time timestamp without time zone,
    observation_text text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    photo_url character varying,
    route_id integer,
    rock_type character varying,
    is_favorite boolean DEFAULT false NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    observation_type character varying DEFAULT 'free'::character varying NOT NULL,
    point_id integer,
    CONSTRAINT observations_type_check CHECK (((observation_type)::text = ANY ((ARRAY['fixed'::character varying, 'free'::character varying, 'checkin'::character varying])::text[])))
);


--
-- Name: observations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.observations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: observations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.observations_id_seq OWNED BY public.observations.id;


--
-- Name: point_learning_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_learning_materials (
    id integer NOT NULL,
    point_id integer NOT NULL,
    title character varying NOT NULL,
    description text,
    material_type character varying NOT NULL,
    file_url character varying,
    file_name character varying,
    file_type character varying,
    file_size integer,
    external_url character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: point_learning_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.point_learning_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: point_learning_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.point_learning_materials_id_seq OWNED BY public.point_learning_materials.id;


--
-- Name: points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.points (
    id integer NOT NULL,
    point_name character varying NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    point_description text,
    task character varying,
    route_id integer,
    point_code character varying,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: points_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.points_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.points_id_seq OWNED BY public.points.id;


--
-- Name: report_evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_evaluations (
    id integer NOT NULL,
    report_id integer NOT NULL,
    teacher_id integer NOT NULL,
    score integer,
    comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_report_score CHECK (((score >= 0) AND (score <= 100)))
);


--
-- Name: report_evaluations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_evaluations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_evaluations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_evaluations_id_seq OWNED BY public.report_evaluations.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id integer NOT NULL,
    student_id integer NOT NULL,
    route_id integer NOT NULL,
    report_text text,
    create_time timestamp without time zone,
    status character varying DEFAULT 'completed'::character varying NOT NULL,
    error_message text
);


--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- Name: route_paths; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.route_paths (
    id integer NOT NULL,
    route_id integer,
    latitude double precision,
    longitude double precision,
    order_index integer,
    coordinate_system character varying NOT NULL
);


--
-- Name: route_paths_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.route_paths_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: route_paths_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.route_paths_id_seq OWNED BY public.route_paths.id;


--
-- Name: routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routes (
    id integer NOT NULL,
    route_name character varying NOT NULL,
    route_description text,
    course_id integer NOT NULL,
    start_date date,
    status character varying DEFAULT 'draft'::character varying,
    is_active boolean DEFAULT true,
    free_observation_enabled boolean DEFAULT false NOT NULL,
    required_free_observation_count integer DEFAULT 0 NOT NULL
);


--
-- Name: routes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.routes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.routes_id_seq OWNED BY public.routes.id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id integer NOT NULL,
    student_name character varying NOT NULL,
    student_email character varying,
    major character varying,
    grade character varying,
    student_number character varying,
    password_hash character varying,
    college character varying,
    current_course_id integer
);


--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teachers (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(100) NOT NULL,
    phone_number character varying(20),
    department character varying(100),
    title character varying(100),
    bio text
);


--
-- Name: teachers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teachers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teachers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teachers_id_seq OWNED BY public.teachers.id;


--
-- Name: tracks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tracks (
    id integer NOT NULL,
    student_id integer NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    recorded_time timestamp without time zone,
    route_id integer NOT NULL
);


--
-- Name: tracks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tracks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tracks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tracks_id_seq OWNED BY public.tracks.id;


--
-- Name: ai_analyses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_analyses ALTER COLUMN id SET DEFAULT nextval('public.ai_analyses_id_seq'::regclass);


--
-- Name: checkins id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkins ALTER COLUMN id SET DEFAULT nextval('public.checkins_id_seq'::regclass);


--
-- Name: course_students id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_students ALTER COLUMN id SET DEFAULT nextval('public.course_students_id_seq'::regclass);


--
-- Name: course_teachers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_teachers ALTER COLUMN id SET DEFAULT nextval('public.course_teachers_id_seq'::regclass);


--
-- Name: courses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses ALTER COLUMN id SET DEFAULT nextval('public.courses_id_seq'::regclass);


--
-- Name: notification_reads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads ALTER COLUMN id SET DEFAULT nextval('public.notification_reads_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: observations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observations ALTER COLUMN id SET DEFAULT nextval('public.observations_id_seq'::regclass);


--
-- Name: point_learning_materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_learning_materials ALTER COLUMN id SET DEFAULT nextval('public.point_learning_materials_id_seq'::regclass);


--
-- Name: points id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points ALTER COLUMN id SET DEFAULT nextval('public.points_id_seq'::regclass);


--
-- Name: report_evaluations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_evaluations ALTER COLUMN id SET DEFAULT nextval('public.report_evaluations_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- Name: route_paths id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_paths ALTER COLUMN id SET DEFAULT nextval('public.route_paths_id_seq'::regclass);


--
-- Name: routes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes ALTER COLUMN id SET DEFAULT nextval('public.routes_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: teachers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers ALTER COLUMN id SET DEFAULT nextval('public.teachers_id_seq'::regclass);


--
-- Name: tracks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracks ALTER COLUMN id SET DEFAULT nextval('public.tracks_id_seq'::regclass);


--
-- Data for Name: ai_analyses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_analyses (id, observation_id, rock_name, rock_type, confidence, structure, mineral, weathering, formation_environment, uncertainty, suggestions, student_report, analysis_time, status) FROM stdin;
16	28	薄层状泥质粉砂岩（或板岩）	沉积岩（或浅变质岩）	中等	薄层状层理（或板理），节理发育，层厚约1-5毫米，呈板状破碎	疑似黏土矿物、细粒石英，表面有地衣（非矿物）	中等至强风化，差异风化明显，沿层面剥落，表面有苔藓和地衣附着	浅海或湖泊低能静水环境（若为沉积岩），或泥质沉积物经低级区域变质（若为板岩）	无法确定新鲜面矿物成分、硬度及盐酸反应，需现场验证；岩石类型需根据变质程度最终定名	敲取新鲜面观察颜色与光泽，用指甲、小刀测试硬度，滴稀盐酸检验钙质，罗盘测量产状	## 识别结果\n\n**岩石名称**：薄层状泥质粉砂岩或板岩\n**岩石类型**：沉积岩（或浅变质岩）\n**可信度**：中等（需现场进一步验证）\n\n## 为什么这样判断\n\n1. **宏观构造特征**：照片中岩石呈现明显的薄层状平行排列，层厚仅数毫米，这是泥质岩类或低级变质岩（板岩）的典型标志。右上角散落的碎石呈板状，说明岩层被节理切割，且沿层面容易劈开，符合泥质含量高、片理（或页理）发育的特性。\n2. **颜色与风化状态**：岩石表面呈暗灰色、灰褐色，风化较强，有苔藓和地衣附着。这种风化色和生物附着常见于泥质岩或浅变质岩，因为其矿物颗粒细、孔隙度小，表层易发生物理风化和生物定殖。\n3. **区域地质背景**：该坐标位于武汉黄陂区，靠近扬子准地台与大别山接合部，志留系、泥盆系碎屑岩及元古界变质岩广泛出露，出现此类薄层状岩石符合区域地质背景。\n4. **排除其他可能**：未见明显的碳酸盐岩风化特征（如溶沟、刀砍纹），也未见粗粒颗粒或气孔构造，因此排除石灰岩、砂岩和火山岩的可能性。\n\n## 野外识别方法\n\n- **看构造**：观察岩石是否成层、层厚大小、沿层面是否容易劈开。薄层状且易劈开者多为泥质岩或板岩。\n- **摸手感**：手摸表面，若感觉细腻滑润，可能是泥质岩；若略显粗糙且有一定硬度，可能为粉砂岩或板岩。\n- **敲新鲜面**：用地质锤敲开，观察内部颜色。若新鲜面呈土状、无光泽，多为泥岩；若呈丝绢光泽或弱光泽，且薄片状明显，则可能是板岩。\n- **测硬度**：指甲刻划（摩氏硬度2.5左右）能刻动者多为泥岩；指甲刻不动，小刀（约5.5）能刻动者多为粉砂岩或板岩。\n- **滴稀盐酸**：若强烈起泡，说明含钙质，可能是钙质粉砂岩或泥灰岩；若不起泡或微弱起泡，则为泥质或硅质。\n- **量产状**：必须用罗盘测量层面（或板理面）的走向、倾向、倾角，这是野外记录的核心数据。\n\n## 知识拓展\n\n1. **页岩、泥岩、粉砂岩的区分**：三者均属细粒碎屑沉积岩，按粒度划分：泥岩（<0.004mm）、页岩（<0.004mm但具页理）、粉砂岩（0.004-0.0625mm）。野外常通过断口（贝壳状断口常见于泥岩）、手感粗糙度及是否易沿层理剥开来区分。\n2. **板岩与千枚岩的鉴别**：板岩变质程度很低，重结晶不明显，断面多呈暗淡无光或土状；千枚岩变质稍深，出现绢云母等矿物，呈现丝绢光泽，且千枚理面上可见细小皱纹。\n3. **节理与层理的区别**：层理反映沉积过程中的原始层面，延伸稳定；节理是岩石形成后受构造应力产生的裂隙，切穿层理，常将岩石切割成规则块体。图中右上角碎石正是两组节理与层面共同作用的结果。\n4. **地衣在风化中的作用**：地衣分泌有机酸，可加速岩石的化学风化，同时其菌丝深入矿物颗粒间产生物理破坏，是生物风化的典型代表。观察时勿将其误认为矿物。\n5. **区域地质价值**：此类薄层状岩石若为志留系泥质粉砂岩，则可能记录了扬子地台在加里东运动后的海退序列；若为元古界变质岩，则反映大别山南缘的区域变质基底。进一步研究可揭示区域构造演化史。\n\n> **实习提示**：同学们在野外务必养成“先观察整体，再分解细节”的习惯。从层理、节理、风化特征入手，再到矿物、结构、构造，最后落笔记录，并附上实测产状和素描图。这张“签到照片”完全可以成为一次小型地质观察的起点。	2026-08-13 02:05:40.308307	completed
15	27	沉积岩（碳酸盐岩，疑似灰岩或泥质灰岩）	沉积岩（碳酸盐岩）	中等	隐晶质或微晶结构，致密块状；发育多组不规则节理（裂隙），呈多边形网格状切割岩石；中部有一条横向的深灰色条带（疑似化石富集带或燧石条带），右侧可见层状/锥状构造（疑似结核或化石截面）	疑似方解石（基质），若为燧石条带则含玉髓/石英	表面风化明显，呈灰白色，有黑色锰质/铁质氧化物斑点或地衣附着；深色条带与基质存在差异风化现象	推测为浅海碳酸盐台地环境（若含化石和灰岩）或较深水硅质沉积环境（若为燧石条带）；区域上武汉地区广泛出露石炭纪—二叠纪碳酸盐岩地层（如黄龙组、栖霞组、茅口组），可能为本地原生岩石或人工搬运的景观石材	1. 必须滴稀盐酸验证是否起泡，以区分灰岩（方解石）与白云岩或硅质岩；2. 需观察新鲜面确认结构；3. 需确认是原生露头还是人工搬运的石材（坐标位于校园附近，疑似景观石）；4. 条带和右侧物体的成因需进一步鉴定（化石 vs 燧石结核 vs 生物扰动构造）	1. 滴稀盐酸（5% HCl）测试起泡反应；2. 用地质锤敲开新鲜面观察内部结构；3. 近距离观察条带和右侧物体，判断是否为化石（如直角石、鹦鹉螺、海百合茎等）或燧石结核；4. 若为原生露头，测量岩层产状；5. 拍摄岩石全貌及周围环境，判断其地质背景	## 识别结果\n\n**岩石名称：** 沉积岩（碳酸盐岩）\n**具体类型：** 疑似灰岩（Limestone）或泥质灰岩，含疑似化石或燧石结核/条带构造\n**可信程度：** 中等（必须现场滴酸验证）\n\n---\n\n## 为什么这样判断\n\n1. **外观特征指向碳酸盐岩：** 岩石整体呈灰白色，致密块状，这是灰岩等碳酸盐岩的典型外观。虽然隐晶质结构肉眼难以分辨颗粒，但整体色调和质地非常符合海相沉积的碳酸盐岩特征。\n\n2. **特殊构造暗示化石或结核：** 图片中部那条横向的深灰色条带非常引人注目，内部隐约可见分节或分段的结构，这很可能是**头足类化石（如直角石 Orthoceras）的纵截面**，或者是成岩过程中形成的**燧石条带（Chert band）**。右侧那个具有同心层状结构的半圆锥状物体，形态非常像**鹦鹉螺类化石的截面**或**燧石结核**。这些特殊构造是判断沉积岩成因和沉积环境的重要窗口。\n\n3. **裂隙特征反映岩石力学性质：** 岩石表面发育的多组不规则多边形裂隙（类似龟裂纹），是坚硬脆性岩石（如灰岩）在构造应力或风化作用下形成的**节理**。这证明岩石已经历了成岩后的构造变动和地表风化。\n\n4. **GPS定位提供区域地质线索：** 坐标位于武汉市洪山区中国地质大学（武汉）附近。武汉地区广泛出露古生代（石炭纪、二叠纪）和三叠纪的碳酸盐岩地层，如栖霞组灰岩常含燧石结核。这块石头可能是本地岩石，也可能作为校园景观石从外地搬运而来。\n\n---\n\n## 野外识别方法\n\n### 第一步：盐酸测试（最关键！）\n- **操作方法：** 用地质锤敲开岩石，在新鲜断面上滴1-2滴稀盐酸（5% HCl）。\n- **判断标准：**\n  - 剧烈起泡 → **灰岩**（方解石 CaCO₃）\n  - 不起泡或微弱起泡（需用粉末） → **白云岩**（CaMg(CO₃)₂）\n  - 完全不起泡 → 可能是**硅质岩**（如燧石）\n\n### 第二步：观察条带和特殊物体\n- **看形态：** 仔细观察中间条带内部是否有生物结构（如隔壁、体管、壳饰）——如果有，就是化石；如果没有，可能是燧石条带或方解石脉。\n- **看硬度：** 用小刀刻划条带部分。如果刻不动且断口呈贝壳状，很可能是**燧石（硅质）**；如果能刻动，可能是方解石。\n- **看右侧物体：** 用放大镜观察其同心层状构造，判断是化石（如鹦鹉螺）还是结核。\n\n### 第三步：判断露头性质\n- **看周围环境：** 这块岩石是自然出露在山坡上，还是铺在地上的石板/景观石？\n- **如果是原生露头：** 测量岩层产状（走向、倾向、倾角），寻找更多同类化石。\n- **如果是人工石材：** 仍然可以观察岩性、结构和化石，但不能代表原地层产状。\n\n### 第四步：补充拍摄\n- 拍摄岩石全貌及周围环境\n- 敲开新鲜面后拍摄内部结构（带比例尺）\n- 对条带和右侧物体拍摄微距特写\n\n---\n\n## 知识拓展\n\n### 1. 地质系学生必须记住的知识点\n\n**碳酸盐岩的识别三角：**\n- **灰岩（石灰岩）：** 主要矿物方解石（CaCO₃），遇稀盐酸剧烈起泡。多形成于温暖浅海环境，常含化石。\n- **白云岩：** 主要矿物白云石（CaMg(CO₃)₂），遇稀盐酸不起泡或微弱起泡（粉末才起泡）。常呈砂糖状断口。\n- **泥灰岩：** 灰岩与黏土矿物的过渡类型，颜色较深，遇酸起泡但留有泥质残留。\n\n**化石 vs 结核的鉴别：**\n- **化石：** 具有生物结构（如对称性、隔壁、壳饰、体管等），形态规则。\n- **结核：** 是成岩过程中矿物围绕某个核心凝聚而成，无生物结构，常呈同心层状或不规则状。\n\n**燧石（Chert）的特征：**\n- 成分：隐晶质石英（SiO₂），硬度7（小刀刻不动），断口呈贝壳状。\n- 产状：常呈结核或条带状赋存于灰岩中（如栖霞组灰岩）。\n- 成因：可能来自硅质生物（放射虫、海绵骨针）的溶解再沉淀，或火山活动提供的硅质。\n\n### 2. 武汉地区常见化石\n- **栖霞组（二叠纪）：** 含燧石结核，化石有䗴类（Fusulinid）、珊瑚（如梁山珊瑚）、腕足类。\n- **黄龙组/船山组（石炭纪）：** 含䗴类、珊瑚、海百合茎。\n- **宝塔组（奥陶纪）：** 含直角石（Orthoceras）、震旦角石。\n\n### 3. 野外工作思维\n即使是一张“签到照片”，也要养成“拍完照、看完岩、记完录”的野外三步曲。**每一块石头都在讲述地球的故事**——你的任务就是学会听懂它的语言。从颜色看成分，从结构看成因，从构造看历史，从化石定时代。这就是地质学的魅力所在！\n\n**老师期待你在现场带回更多发现！**	2026-08-13 01:59:24.416184	completed
20	33	板岩（或千枚岩）与紫红色风化壳	变质岩（下部板岩/千枚岩）与风化残积层（上部）	中高，需现场验证光泽度等区分板岩与千枚岩	下部板劈理发育，具平行破裂面，节理切割；上部土状结构	下部：石英、绢云母、绿泥石（推测）；上部：高岭石、褐铁矿、赤铁矿	差异风化显著，上部强风化呈紫红色疏松层，下部中等风化，沿劈理面层状剥离，边缘球状风化	原岩为浅海-半深海泥质沉积或基性凝灰岩，经区域低温动力变质形成板岩/千枚岩，后地壳抬升暴露，在亚热带湿热气候下化学风化形成红层风化壳	板岩与千枚岩的区分需观察劈理面光泽；原岩成分需进一步确认；接触关系是否为渐变或突变需清理界面；需测产状和盐酸反应	敲开新鲜面观察颜色和矿物；在风化壳中寻找铁锰结核；追踪面理连续性；测量面理和节理产状；拍摄劈理面侧光照片和接触带全景	## 识别结果\n\n本次观察点位于武汉江夏-洪山一带，出露一套典型的**变质岩与风化壳组合**。\n- **下部主体岩石**：灰绿色、暗绿色，具极发育的平行薄板状破裂面，初步鉴定为**板岩**（或千枚岩），属低级区域变质岩。\n- **上部覆盖层**：紫红色、褐红色，质地疏松，为**强风化残积层**（红层风化壳），由下伏变质岩或原岩风化而成。\n- **可信度**：中高。构造特征明显，与区域地质背景吻合，但需现场进一步验证变质程度。\n\n## 为什么这样判断\n\n1. **构造证据**：下部岩石的平行破裂面非常密集，呈薄板状分离，这是**板劈理**的典型标志。劈理是低级变质岩（板岩、千枚岩）的鉴定特征，与沉积层理不同，它是变质作用形成的定向构造。\n2. **颜色信息**：下部灰绿色暗示原岩富含铁镁质矿物（如绿泥石），反映还原环境；上部紫红色是铁元素氧化为三价铁（赤铁矿、褐铁矿）的结果，指示地表氧化环境。“上红下绿”是武汉地区古生代基底及其风化壳的常见配色。\n3. **区域背景**：GPS坐标位于中国地质大学（武汉）周边实习区，区域上广泛出露志留系-泥盆系浅变质岩系（如纱帽组、云台观组），岩性以板岩、千枚岩、石英砂岩为主，与本露头高度符合。\n4. **风化特征**：下部岩石抗风化能力较强，形成陡坎；上部风化层松软易剥落，形成缓坡，差异风化明显。同时岩石边缘圆化、沿劈理层层剥离，展示了物理与化学风化的共同作用。\n\n## 野外识别方法\n\n### 1. 区分板岩与千枚岩的关键技巧\n- **光泽度观察**：用锤子敲出新鲜劈理面，用手电筒侧光照射。\n  - 无光泽或土状光泽 → **板岩**\n  - 明显丝绢光泽（像丝绸反光） → **千枚岩**\n- **硬度测试**：用小刀刻划。板岩较硬，小刀刻划有阻力，刻痕浅；千枚岩较软，易刻出粉末。\n- **结晶程度**：板岩肉眼无法分辨矿物颗粒，千枚岩在放大镜下可见细小绢云母、绿泥石鳞片。\n\n### 2. 区分层理与劈理\n- **层理**：是沉积时形成的，常表现为颜色、粒度的交替变化，层面可能不平整，且往往倾斜方向与古水流有关。\n- **劈理**：是变质作用形成的，密集平行排列，常切割层理，且产状与区域构造应力场相关。在露头上，如果看到劈理面与可能的层理面斜交，则劈理面更亮、更平整。\n- **产状测量**：测量这个平行面的产状，如果与区域劈理产状一致，则证实是劈理。\n\n### 3. 风化壳的观察\n- 注意风化壳的厚度变化，是否与地形、裂隙有关。\n- 在紫红色层中寻找**铁锰结核**（姜结石），这是风化淋滤作用的证据。\n- 判断接触关系：是渐变过渡（风化前锋）还是突变（如断层或不整合）？清理剖面观察。\n\n### 4. 记录与采样\n- 测量劈理产状（走向、倾向、倾角）和节理产状，记录在野外记录本上。\n- 拍摄照片时，务必放置比例尺（硬币、地质锤刻度），并拍特写（劈理面光泽）、侧光、全景。\n- 采集新鲜岩石标本，用于室内鉴定。\n\n## 知识拓展\n\n- **板岩与千枚岩的演化**：板岩在温度、压力进一步升高时会转变为千枚岩，矿物颗粒增大，出现丝绢光泽。所以它们属于同一变质序列，只是变质程度不同。在武汉地区，志留系地层常可见到板岩与千枚岩的过渡。\n- **红层风化壳的古气候意义**：紫红色风化壳是湿热气候的产物，指示地质历史时期（如第四纪）武汉地区曾经历长期的高温多雨环境，促使铁元素强烈氧化。此类风化壳在长江中下游普遍发育。\n- **野外安全**：风化壳和劈理发育的岩石常有崩塌风险，观察时不要站在陡坎下方，注意上方松动岩块。\n- **思考题**：如果下部岩石新鲜面滴稀盐酸微弱起泡，说明了什么？可能原岩中含有钙质成分，在变质过程中未完全迁移。这提示我们，野外观察要综合多种手段。	2026-08-14 03:16:28.496069	completed
\.


--
-- Data for Name: checkins; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.checkins (id, student_id, checkin_time, point_id, latitude, longitude, status) FROM stdin;
5	3	2026-08-13 01:59:17.376776	10	30.456384673141045	114.31535464056289	success
6	3	2026-08-13 02:05:31.184671	9	30.456708833977086	114.31554057522071	success
9	4	2026-08-14 02:41:03.997162	10	30.4562220748	114.315220259	success
\.


--
-- Data for Name: course_students; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.course_students (id, course_id, student_id) FROM stdin;
2	8	3
3	8	4
\.


--
-- Data for Name: course_teachers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.course_teachers (id, course_id, teacher_id) FROM stdin;
7	8	1
8	9	1
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.courses (id, course_name, course_description, is_active) FROM stdin;
8	武汉地质野外实习	岩石观察与地质路线调查	t
9	测试删除	测试删除	f
\.


--
-- Data for Name: notification_reads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_reads (id, notification_id, student_id, read_at) FROM stdin;
1	1	3	2026-08-14 07:33:16.795159
2	3	3	2026-08-14 08:48:40.923277
3	2	3	2026-08-14 08:48:50.147137
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, title, content, type, course_id, route_id, created_at, student_id) FROM stdin;
1	新实习路线已发布	路线“融创地质考察路线”已发布，请及时查看实习任务。	route	8	9	2026-08-14 01:49:18.384711	\N
2	实习报告评价已更新	你的“东湖地质考察路线”实习报告已有新的评分或教师评语，请及时查看。	evaluation	8	4	2026-08-14 08:47:55.670929	3
3	实习报告评价已更新	你的“东湖地质考察路线”实习报告已有新的评分或教师评语，请及时查看。	evaluation	8	4	2026-08-14 08:48:12.267969	3
\.


--
-- Data for Name: observations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.observations (id, student_id, observation_time, observation_text, latitude, longitude, photo_url, route_id, rock_type, is_favorite, is_pinned, observation_type, point_id) FROM stdin;
27	3	2026-08-13 01:59:17.381064	大门111签到照片	30.456384673141045	114.31535464056289	uploads/3832cfdb-7647-439c-84f8-cea1f1ff5fd5.jpg	4	\N	f	f	checkin	10
28	3	2026-08-13 02:05:31.186419	超星公司签到照片	30.456708833977086	114.31554057522071	uploads/ebafd9a6-dcbb-4c0c-8937-cf4990b4f912.jpg	4	\N	f	f	checkin	9
32	4	2026-08-14 02:41:03.99824	大门111签到照片	30.4562220748	114.315220259	uploads/8066d448-6f38-43b6-9a04-0140e5790f20.jpg	4	\N	f	f	checkin	10
33	3	2026-08-14 03:16:28.477997	该露头上部为紫红色风化岩层，下部为灰绿色薄层状岩石，层理或片理明显，裂隙较发育，局部呈板状剥离。上下部颜色和结构差异较明显，可能反映不同岩性或不同风化程度。初步判断下部可能为板岩或千枚岩，上部可能为风化泥质岩，但需结合现场进一步确认。	30.456609708429788	114.31539010067758	uploads/a6c9c394-40bf-4eff-a181-846736e0898e.jpg	4	\N	f	f	free	\N
\.


--
-- Data for Name: point_learning_materials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.point_learning_materials (id, point_id, title, description, material_type, file_url, file_name, file_type, file_size, external_url, created_at, updated_at) FROM stdin;
1	4	各个点位介绍	测试	file	uploads/point_materials/56e1624bf92447dab2153346b758c439.docx	图片解读.docx	application/vnd.openxmlformats-officedocument.wordprocessingml.document	2757100	\N	2026-08-13 08:28:05.837783	2026-08-13 08:28:05.837788
\.


--
-- Data for Name: points; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.points (id, point_name, latitude, longitude, point_description, task, route_id, point_code, is_active) FROM stdin;
1	石灰岩露头观察点	30.45665	114.3162	记录碳酸盐岩露头特征	观察岩石层理结构	1	P01	t
2	地貌观察点	30.4571	114.317	记录区域地貌特征	观察周边地形	1	P02	t
4	大门	30.457076599409177	114.31635726024152	测试	测试	4	\N	t
5	23栋门口	30.457330492025463	114.31568818959818	测试	测试	4	\N	f
6	1	30.869880755987367	114.11263255783969	1	1	7	\N	t
7	2	30.86107509986327	114.12287411391813	2	2	7	\N	t
8	3	30.861083435804915	114.12846181908084	3	3	7	\N	t
3	超星公司	30.456403264941542	114.31560130455819	测试	测试	4	\N	f
9	超星公司	30.456721353565186	114.31589919974817	1	1	4	\N	t
10	大门111	30.456315016902167	114.3155519956425	1	1	4	\N	t
11	1	30.457546195480703	114.31384338826544	1	测	9	\N	t
12	2	30.457605757728217	114.31461350077069	2	2	9	\N	t
13	3	30.45676216490598	114.31467236741418	3	3	9	\N	t
\.


--
-- Data for Name: report_evaluations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.report_evaluations (id, report_id, teacher_id, score, comment, created_at, updated_at) FROM stdin;
1	7	1	88	需要多加改进	2026-08-14 08:47:55.677311	2026-08-14 08:48:12.269051
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reports (id, student_id, route_id, report_text, create_time, status, error_message) FROM stdin;
7	3	4	# 地质野外实习报告\n\n## 一、实习基本信息\n\n- **课程名称**：武汉地质野外实习\n- **学生姓名**：陈某某\n- **专业**：地质学\n- **实习路线**：东湖地质考察路线\n\n## 二、实习目的\n\n- 认识武汉东湖地区的地质背景，了解出露的岩石类型、地层组合及风化壳发育特征。\n- 训练野外地质现象识别、描述与记录的基本方法，掌握地质露头素描、产状测量、样品采集等技能。\n- 学习变质岩与风化残积层的宏观鉴定标志，能依据颜色、结构、构造、矿物组成等初步判别板岩、千枚岩及风化壳，并分析其成因。\n\n## 三、实习路线与过程\n\n实习沿东湖地质考察路线进行，于2026年8月13日凌晨完成两个打卡点（点号10、点号9）的登记，状态均为成功。  \n实习中提交了一份自由观察记录（未关联具体打卡点），描述了一处露头的地质特征，作为本次实习的核心观察点。两个打卡点尚未提交对应的观察记录，**需要补充**。\n\n## 四、主要观察点分析\n\n### 观察点：自由观察点（东湖路线某露头）\n\n#### 观察对象\n（未提供图片，**需要补充**）\n\n露头剖面显示：上部为紫红色风化岩层，下部为灰绿色薄层状岩石。\n\n#### 岩性及地质现象判断\n- 下部岩石：初步定为板岩或千枚岩，属变质岩。\n- 上部岩层：推断为风化残积层（风化壳），原岩可能为泥质岩。\n- 地质现象：差异风化显著，露头表现出明显的颜色分带与结构变化。\n\n#### 宏观特征描述\n- **颜色**：下部呈灰绿色，新鲜面颜色略深；上部呈紫红色，整体色调较均匀。\n- **结构**：下部板劈理发育，具平行破裂面，岩石以薄层状、板状剥离；上部为疏松土状结构，无完整岩石。\n- **构造**：下部层理或片理明显，被节理、裂隙切割；上部不显层理，为覆盖状风化壳。\n- **风化程度**：上部强风化，已形成紫红色疏松土层；下部中等风化，沿劈理面发生层状剥落，边缘可见球状风化迹象。\n\n#### 地质解释\n该露头记录了变质岩上部风化壳的完整剖面。原岩推测为浅海—半深海相泥质沉积或基性凝灰岩，经区域低温动力变质作用形成板岩/千枚岩。后期地壳抬升，岩体暴露于地表，在亚热带湿热气候条件下遭受强烈化学风化，形成富含铁氧化物的紫红色风化残积层。上下部颜色与结构的突变，反映了抗风化能力的差异：下部致密板理发育的岩石较难风化，而上部泥质含量高或原岩成分差异的部位更易风化剥蚀。\n\n#### 需进一步验证\n1. 岩性精确定名：需观察新鲜劈理面是否具丝绢光泽，以区分板岩与千枚岩。\n2. 原岩成分：需对下部新鲜岩石进行矿物含量估算，进一步确认原岩类型。\n3. 接触关系：上部风化壳与下部基岩之间为渐变过渡还是突变界面，需清理露头后观察。\n4. 产状要素：需测量下部板劈理及节理面的产状。\n5. 化学验证：需用稀盐酸测试岩石是否起泡，以排除碳酸盐岩可能性。\n\n## 五、实习过程总结\n\n学生陈某某在本次实习中，沿东湖路线完成两个打卡点登记，并独立提交了一份详细的自由观察记录。记录内容涵盖颜色、结构、构造、风化程度、矿物推测及成因分析，体现出对野外观察方法和岩石识别流程的初步掌握。  \n主要学习内容：板岩/千枚岩的宏观识别标志、风化壳剖面特征描述、差异风化现象的成因解释及野外不确定性分析。  \n不足之处：观察记录未与具体打卡点关联，且未提供照片、产状数据等佐证材料，**需要补充**。\n\n## 六、个人实习心得\n\n**需要补充**（学生未提交个人总结）。	2026-08-14 08:44:49.406504	completed	\N
8	3	4	# 地质野外实习报告\n\n## 一、实习基本信息\n\n- **课程名称**：武汉地质野外实习  \n- **学生信息**：陈某某，地质学专业  \n- **实习路线**：东湖地质考察路线（路线描述：测试）  \n- **实习日期**：2026年8月13日  \n\n## 二、实习目的\n\n1. 认识武汉地区东湖沿线的基本地质特征，了解区域岩石类型与风化壳发育情况。  \n2. 学习野外地质观察的基本方法，包括露头描述、岩石识别、构造现象记录等。  \n3. 掌握常见岩石（特别是浅变质岩）的肉眼鉴定方法，熟悉板劈理、风化壳等典型野外标志。  \n\n## 三、实习路线与过程\n\n本次实习沿东湖地质考察路线开展，依次经过两个预定观察点（点10、点9），并于路线中间地段进行自由观察。实习过程中，完成两个观察点的打卡，并在自由观察点进行了详细的露头描述与记录。具体过程如下：\n\n- **点10**：打卡时间 2026-08-13 01:59:17，打卡成功。  \n- **自由观察点**：位于路线中段（坐标：30.4566°N，114.3154°E），未与打卡点绑定，进行了岩石、风化壳及构造现象的详细观察与记录。  \n- **点9**：打卡时间 2026-08-13 02:05:31，打卡成功。  \n\n实习整体完成情况：2个观察点全部成功打卡，完成1个自由观察点的详细记录，无遗漏或异常。\n\n## 四、主要观察点分析\n\n### 自由观察点（东湖沿线露头）\n\n#### 图片及观察对象  \n未提供照片，仅依据文字描述。观察对象为自然露头，出露岩层分为上、下两部分，呈现明显的颜色与结构差异。\n\n#### 岩石/地质现象判断  \n下部为灰绿色薄层状岩石，发育密集劈理，初步判断为板岩或千枚岩；上部为紫红色疏松层，判断为风化残积层（红土型风化壳）。整体为差异风化塑造的典型剖面，接触关系需进一步厘清。\n\n#### 岩石特征  \n\n- **颜色**：下部新鲜面推测为灰绿色，风化面呈暗淡色调；上部为紫红色、褐红色。  \n- **结构**：下部具板劈理构造，裂面平整且平行排列，可见节理切割；上部呈土状结构，疏松多孔。  \n- **构造**：下部劈理（板劈理）发育，沿劈理面可发生板状剥离，局部有球状风化迹象；上部无原生构造，为风化残积物。  \n- **风化**：差异风化十分显著。上部强烈风化，形成紫红色疏松层；下部中等风化，沿劈理面层状剥落，边缘见球状风化，反映出风化程度由上向下递减。\n\n#### 地质解释  \n\n原岩可能为浅海-半深海相泥质沉积或基性凝灰岩，经区域低温动力变质作用，形成板岩或千枚岩。后期地壳抬升，岩石暴露于地表，在亚热带湿热气候条件下，发生强烈的化学风化，形成以高岭石、褐铁矿、赤铁矿为主的红层风化壳。上部风化壳的紫红色调主要由赤铁矿渲染，下部岩石因风化程度较弱而保留灰绿色调。劈理发育为变质期中低应力条件下的产物，后期节理切割则与近地表脆性变形有关。\n\n#### 需要进一步验证内容  \n\n1. **板岩与千枚岩的区分**：需在新鲜劈理面上观察丝绢光泽，若光泽明显则为千枚岩，暗淡则为板岩。  \n2. **原岩成分确认**：需敲开新鲜面，观察矿物组成，并尝试盐酸反应，以判断是否存在碳酸盐矿物。  \n3. **接触关系**：上、下部之间为渐变过渡还是突变界面，需清理浮土后观察，明确风化壳与基岩的接触性质。  \n4. **产状与构造**：应测量劈理产状和节理产状，追踪面理在空间上的连续性。  \n5. **风化壳特征**：可在风化壳中寻找铁锰结核等典型产物，进一步确认风化类型。  \n\n（注：以上验证内容因本次实习未进行现场补充工作，故标注为“需要补充”。）\n\n## 五、实习过程总结\n\n学生陈某某按计划完成东湖地质考察路线，两个预定观察点均成功打卡，并在路线中段主动进行了一个自由观察点的详细记录。通过该观察点，学生识别了灰绿色板岩（或千枚岩）与上覆紫红色风化壳，观察并描述了板劈理、差异风化、球状风化等典型现象，初步分析了岩石成因与风化过程。整体来看，学生完成了路线要求的观察任务，掌握了变质岩野外识别的基本方法，同时对风化壳类型与形成环境有了直观认识。不足之处在于，部分关键鉴定特征（如千枚岩光泽、原岩成分）未能现场验证，需在后续工作中补足。\n\n## 六、个人实习心得\n\n本次武汉东湖野外实习，使我第一次近距离观察了浅变质岩与风化壳的典型剖面。露头中上下部颜色与结构的强烈反差，生动体现了差异风化的作用，让我深刻体会到气候条件对地表改造的重要性。在识别下部岩石时，我认识到板岩与千枚岩的肉眼区分并不容易，尤其在野外风化面下，必须借助劈理面光泽和新鲜面特征才能准确判断。此外，风化壳中紫红色调与铁氧化物矿物的关系，也让我对化学风化产物的颜色指示有了一定理解。  \n\n实习中，我意识到自己在地质产状测量、接触关系判断等方面仍不熟练，许多推测需要更扎实的现场工作来支撑。今后，我会加强基本功训练，注重将课堂理论与野外现象紧密结合，提高独立观察与分析的能力。  \n\n（注：个人心得根据学生观察记录中反映的不确定性、验证需求及常见野外实习收获模拟生成，学生未提供单独的文本总结，上述内容与实习记录精神一致。）	2026-08-14 09:40:19.799951	completed	\N
9	3	4	\N	2026-08-14 09:42:45.663366	failed	Dify请求失败：HTTPSConnectionPool(host='api.dify.ai', port=443): Max retries exceeded with url: /v1/workflows/run (Caused by SSLError(SSLEOFError(8, '[SSL: UNEXPECTED_EOF_WHILE_READING] EOF occurred in violation of protocol (_ssl.c:1016)')))
10	3	4	## 地质野外实习报告\n\n### 一、实习基本信息\n\n| 项目           | 内容                                         |\n|----------------|----------------------------------------------|\n| **课程名称**   | 武汉地质野外实习                             |\n| **学生信息**   | 陈某某，2023级地质学专业                     |\n| **实习路线**   | 东湖地质考察路线                             |\n\n### 二、实习目的\n\n1. 认识武汉东湖地区出露的岩石类型、地层组合及风化特征。\n2. 学习野外露头观察、记录的基本方法。\n3. 初步掌握变质岩及风化壳的野外识别与鉴定技能。\n\n### 三、实习路线与过程\n\n实习沿东湖地质考察路线进行，共设两个规定签到点，均已完成打卡。路线中一自由观察点（约北纬30.4566°，东经114.3154°）进行了详细观测记录，其余签到点未提交专项记录。\n\n### 四、主要观察点分析\n\n**观察点：紫红色风化壳与灰绿色板岩（千枚岩）复合露头**\n\n- **岩石/地质现象判断**：上部为强风化紫红色残积层，下部为灰绿色薄层状板岩（或千枚岩），呈现差异风化特征。\n- **岩石特征**：下部岩石灰绿色，板状构造，中等风化，沿劈理面剥落；上部紫红色，土状疏松，强风化，原岩结构基本破坏。\n- **地质解释**：原岩为泥质岩或基性凝灰岩，经低级变质成板岩（千枚岩），后地表风化，上部形成紫红色铁铝富集风化壳，下部保留较完整变质结构。\n- **需进一步验证**：区分板岩与千枚岩（丝绢光泽）、确认原岩成分、查明上下接触关系。\n\n### 五、实习过程总结\n\n学生按时完成两个签到点打卡，并提交一份自由观察记录，内容详实。实习中观察并描述了变质岩与风化壳的组合特征，初步分析了差异风化现象，体现了将课堂知识应用于野外实践的能力。观察记录细致，能主动提出需验证的科学问题，态度认真，达到了实习教学要求。\n\n### 六、个人实习心得\n\n这次野外实习让我对课堂知识有了更直观的认识。野外露头信息复杂，需要综合颜色、结构、构造和风化程度等多因素判断，真正体会到理论联系实际的重要性。在识别板岩与千枚岩时感到困难，对地层接触关系判断不够果断，认识到自身在岩石学、地层学方面的不足，亟需加强野外鉴定经验。实习让我熟悉了野外观察记录流程，学会了从杂乱的露头中提取关键信息，这些收获激励我在后续学习中更注重实践能力的培养。	2026-08-14 09:44:25.431893	completed	\N
\.


--
-- Data for Name: route_paths; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.route_paths (id, route_id, latitude, longitude, order_index, coordinate_system) FROM stdin;
16	1	30.4562	114.315385	1	WGS84
17	1	30.45665	114.3162	2	WGS84
18	1	30.4571	114.317	3	WGS84
26	7	30.86991487156088	114.11272064860864	0	WGS84
27	7	30.8697847127021	114.12317680290046	1	WGS84
28	7	30.86577308234989	114.1230139376955	2	WGS84
29	7	30.85689468514063	114.12320073836187	3	WGS84
30	7	30.856637310765336	114.12855395634418	4	WGS84
31	7	30.865548645310867	114.12846411164114	5	WGS84
32	7	30.864974072182193	114.13921807163784	6	WGS84
33	4	30.4561420605409	114.31534513289401	0	WGS84
34	4	30.457412098269245	114.3167200983412	1	WGS84
35	4	30.4576658351109	114.31636655026632	2	WGS84
36	4	30.45724529129616	114.31595558374033	3	WGS84
37	4	30.4573845546486	114.31560546363269	4	WGS84
38	4	30.457027427388937	114.31518608300533	5	WGS84
39	4	30.45660987033348	114.31577514801062	6	WGS84
40	9	30.457363919389763	114.31360027391166	0	WGS84
41	9	30.45789311318326	114.31430132126044	1	WGS84
42	9	30.457175085334185	114.31509887868708	2	WGS84
43	9	30.456512399258173	114.31437235453484	3	WGS84
44	9	30.45726798863265	114.31356023064423	4	WGS84
\.


--
-- Data for Name: routes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.routes (id, route_name, route_description, course_id, start_date, status, is_active, free_observation_enabled, required_free_observation_count) FROM stdin;
1	黄陵背斜观察路线	观察碳酸盐岩和构造	1	\N	draft	t	f	0
2	东湖地质考察路线	观察岩石风化情况	8	2026-08-06	draft	f	f	0
3	东湖地质考察路线	测试	8	2026-08-06	draft	f	f	0
5	东湖地质考察路线	测	8	2026-08-08	published	f	f	0
6	测试路线2	测试	8	2026-08-12	draft	f	f	0
7	测试路线2	测试	8	2026-08-09	published	f	t	3
8	测试路线2	测试	8	2026-08-09	draft	f	t	2
4	东湖地质考察路线	测试	8	2026-08-07	published	t	t	3
9	融创地质考察路线	测试	8	2026-08-12	published	t	t	2
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.students (id, student_name, student_email, major, grade, student_number, password_hash, college, current_course_id) FROM stdin;
3	陈某某	\N	地质学	大二	123456	$2b$12$TihVbuP5e3ry.FPXjrkWve4ygAzxELoMfXnCOCSpst5/F9jNHwmhW	地质勘探学院	8
4	吴某	\N	地质学	大二	112233	$2b$12$7cQuNRVrFHh39w9XvkZrA.V3e4JgqlWetis1FnGC8JKO0ylybPIqC	地质勘探学院	8
\.


--
-- Data for Name: teachers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.teachers (id, name, email, password, phone_number, department, title, bio) FROM stdin;
1	李老师	cyf20030706@gmail.com	123456	6124974665	地质勘探学院	教授	测试专用账户
\.


--
-- Data for Name: tracks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tracks (id, student_id, latitude, longitude, recorded_time, route_id) FROM stdin;
\.


--
-- Name: ai_analyses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ai_analyses_id_seq', 20, true);


--
-- Name: checkins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.checkins_id_seq', 9, true);


--
-- Name: course_students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.course_students_id_seq', 3, true);


--
-- Name: course_teachers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.course_teachers_id_seq', 8, true);


--
-- Name: courses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.courses_id_seq', 9, true);


--
-- Name: notification_reads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notification_reads_id_seq', 3, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 3, true);


--
-- Name: observations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.observations_id_seq', 33, true);


--
-- Name: point_learning_materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.point_learning_materials_id_seq', 1, true);


--
-- Name: points_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.points_id_seq', 13, true);


--
-- Name: report_evaluations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.report_evaluations_id_seq', 1, true);


--
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reports_id_seq', 10, true);


--
-- Name: route_paths_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.route_paths_id_seq', 44, true);


--
-- Name: routes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.routes_id_seq', 9, true);


--
-- Name: students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.students_id_seq', 4, true);


--
-- Name: teachers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.teachers_id_seq', 1, true);


--
-- Name: tracks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tracks_id_seq', 2, true);


--
-- Name: ai_analyses ai_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_analyses
    ADD CONSTRAINT ai_analyses_pkey PRIMARY KEY (id);


--
-- Name: checkins checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkins
    ADD CONSTRAINT checkins_pkey PRIMARY KEY (id);


--
-- Name: course_students course_students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_students
    ADD CONSTRAINT course_students_pkey PRIMARY KEY (id);


--
-- Name: course_teachers course_teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_teachers
    ADD CONSTRAINT course_teachers_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: notification_reads notification_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: observations observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT observations_pkey PRIMARY KEY (id);


--
-- Name: point_learning_materials point_learning_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_learning_materials
    ADD CONSTRAINT point_learning_materials_pkey PRIMARY KEY (id);


--
-- Name: points points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points
    ADD CONSTRAINT points_pkey PRIMARY KEY (id);


--
-- Name: report_evaluations report_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_evaluations
    ADD CONSTRAINT report_evaluations_pkey PRIMARY KEY (id);


--
-- Name: report_evaluations report_evaluations_report_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_evaluations
    ADD CONSTRAINT report_evaluations_report_id_key UNIQUE (report_id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: route_paths route_paths_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_paths
    ADD CONSTRAINT route_paths_pkey PRIMARY KEY (id);


--
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_student_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_student_email_key UNIQUE (student_email);


--
-- Name: students students_student_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_student_number_key UNIQUE (student_number);


--
-- Name: teachers teachers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_email_key UNIQUE (email);


--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- Name: tracks tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_pkey PRIMARY KEY (id);


--
-- Name: checkins unique_student_point_checkin; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkins
    ADD CONSTRAINT unique_student_point_checkin UNIQUE (student_id, point_id);


--
-- Name: ai_analyses uq_ai_analyses_observation_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_analyses
    ADD CONSTRAINT uq_ai_analyses_observation_id UNIQUE (observation_id);


--
-- Name: notification_reads uq_notification_reads_notification_student; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT uq_notification_reads_notification_student UNIQUE (notification_id, student_id);


--
-- Name: ix_ai_analyses_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_analyses_id ON public.ai_analyses USING btree (id);


--
-- Name: ix_ai_analyses_observation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ai_analyses_observation_id ON public.ai_analyses USING btree (observation_id);


--
-- Name: ix_checkins_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_checkins_id ON public.checkins USING btree (id);


--
-- Name: ix_checkins_point_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_checkins_point_id ON public.checkins USING btree (point_id);


--
-- Name: ix_checkins_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_checkins_student_id ON public.checkins USING btree (student_id);


--
-- Name: ix_course_students_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_course_students_id ON public.course_students USING btree (id);


--
-- Name: ix_course_teachers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_course_teachers_id ON public.course_teachers USING btree (id);


--
-- Name: ix_courses_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_courses_id ON public.courses USING btree (id);


--
-- Name: ix_notification_reads_notification_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notification_reads_notification_id ON public.notification_reads USING btree (notification_id);


--
-- Name: ix_notification_reads_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notification_reads_student_id ON public.notification_reads USING btree (student_id);


--
-- Name: ix_notifications_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_course_id ON public.notifications USING btree (course_id);


--
-- Name: ix_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: ix_notifications_route_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_route_id ON public.notifications USING btree (route_id);


--
-- Name: ix_notifications_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_student_id ON public.notifications USING btree (student_id);


--
-- Name: ix_observations_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_observations_id ON public.observations USING btree (id);


--
-- Name: ix_observations_point_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_observations_point_id ON public.observations USING btree (point_id);


--
-- Name: ix_observations_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_observations_student_id ON public.observations USING btree (student_id);


--
-- Name: ix_point_learning_materials_point_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_point_learning_materials_point_id ON public.point_learning_materials USING btree (point_id);


--
-- Name: ix_points_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_points_id ON public.points USING btree (id);


--
-- Name: ix_report_evaluations_teacher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_report_evaluations_teacher_id ON public.report_evaluations USING btree (teacher_id);


--
-- Name: ix_reports_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reports_id ON public.reports USING btree (id);


--
-- Name: ix_reports_route_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reports_route_id ON public.reports USING btree (route_id);


--
-- Name: ix_reports_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reports_student_id ON public.reports USING btree (student_id);


--
-- Name: ix_routes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_routes_id ON public.routes USING btree (id);


--
-- Name: ix_students_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_students_id ON public.students USING btree (id);


--
-- Name: ix_teachers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_teachers_id ON public.teachers USING btree (id);


--
-- Name: ix_tracks_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tracks_id ON public.tracks USING btree (id);


--
-- Name: ix_tracks_recorded_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tracks_recorded_time ON public.tracks USING btree (recorded_time);


--
-- Name: ix_tracks_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tracks_student_id ON public.tracks USING btree (student_id);


--
-- Name: ai_analyses ai_analyses_observation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_analyses
    ADD CONSTRAINT ai_analyses_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES public.observations(id);


--
-- Name: checkins checkins_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkins
    ADD CONSTRAINT checkins_point_id_fkey FOREIGN KEY (point_id) REFERENCES public.points(id);


--
-- Name: checkins checkins_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkins
    ADD CONSTRAINT checkins_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: course_students course_students_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_students
    ADD CONSTRAINT course_students_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: course_students course_students_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_students
    ADD CONSTRAINT course_students_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: report_evaluations fk_report_evaluations_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_evaluations
    ADD CONSTRAINT fk_report_evaluations_report FOREIGN KEY (report_id) REFERENCES public.reports(id);


--
-- Name: report_evaluations fk_report_evaluations_teacher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_evaluations
    ADD CONSTRAINT fk_report_evaluations_teacher FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- Name: students fk_students_current_course; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT fk_students_current_course FOREIGN KEY (current_course_id) REFERENCES public.courses(id);


--
-- Name: tracks fk_tracks_route; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT fk_tracks_route FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: notification_reads notification_reads_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;


--
-- Name: notification_reads notification_reads_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: notifications notifications_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: notifications notifications_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: observations observations_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT observations_point_id_fkey FOREIGN KEY (point_id) REFERENCES public.points(id);


--
-- Name: observations observations_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT observations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: point_learning_materials point_learning_materials_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_learning_materials
    ADD CONSTRAINT point_learning_materials_point_id_fkey FOREIGN KEY (point_id) REFERENCES public.points(id) ON DELETE CASCADE;


--
-- Name: points points_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points
    ADD CONSTRAINT points_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: route_paths route_paths_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_paths
    ADD CONSTRAINT route_paths_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: tracks tracks_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 5aLYyixK4ehCh1bawSpP8jp7TIlLJwy3Qr8GvHyOtSrAbE4Oormj1t7vQlE6UbD

