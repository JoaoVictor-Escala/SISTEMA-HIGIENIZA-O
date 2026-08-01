import { useState } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, AlertTriangle, CheckCircle, Mail, Key } from 'lucide-react';
import { login, register, forgotPassword } from '../api';
import { Input, Button, Checkbox, Card, CardBody, CardHeader, Link as HeroLink } from "@nextui-org/react";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const refCode = params.get('ref');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [isRegister, setIsRegister] = useState(!!refCode);
  const [isForgot, setIsForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const justVerified = params.get('verified') === 'true';
  const tokenError = params.get('error') === 'token_invalido';

  if (localStorage.getItem('token')) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isForgot) {
        await forgotPassword(email);
        setForgotSent(true);
      } else if (isRegister) {
        if (!name) throw new Error('O nome é obrigatório');
        await register(name, email, password, refCode);
        setRegistered(true);
      } else {
        const data = await login(email, password);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fadeVariants = {
    hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, filter: "blur(4px)", transition: { duration: 0.2 } }
  };

  if (registered) {
    return (
      <div className="relative overflow-hidden min-h-screen flex items-center justify-center bg-[#0B0F19]">
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>
        <motion.div initial="hidden" animate="visible" variants={fadeVariants} className="z-10 w-full max-w-md p-4">
          <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 shadow-2xl p-6" radius="lg">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                <Mail size={36} className="text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Confira seu e-mail!</h2>
              <p className="text-slate-400">Enviamos um link de confirmação para <span className="text-blue-400 font-medium">{email}</span>. Clique nele para entrar no sistema em modo Beta.</p>
              <HeroLink color="primary" className="cursor-pointer text-sm" onPress={() => setRegistered(false)}>
                Tentar novamente
              </HeroLink>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (forgotSent) {
    return (
      <div className="relative overflow-hidden min-h-screen flex items-center justify-center bg-[#0B0F19]">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-red-600/10 blur-[120px]" />
        </div>
        <motion.div initial="hidden" animate="visible" variants={fadeVariants} className="z-10 w-full max-w-md p-4">
          <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 shadow-2xl p-6" radius="lg">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <Key size={36} className="text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Link Enviado!</h2>
              <p className="text-slate-400">Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes.</p>
              <Button color="primary" variant="flat" onPress={() => { setForgotSent(false); setIsForgot(false); }} className="w-full mt-2 font-semibold">
                Voltar ao Login
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden min-h-screen flex items-center justify-center bg-[#0B0F19] font-sans dark text-foreground">
      {/* Dynamic Backgrounds (Magic UI aesthetic) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiIvPjwvc3ZnPg==')] opacity-30 mask-image-radial-gradient"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="z-10 w-full max-w-md p-4 sm:p-0"
      >
        <Card className="bg-slate-900/60 backdrop-blur-2xl border border-white/5 shadow-[0_0_80px_rgba(37,99,235,0.15)] p-2 sm:p-4" radius="lg">
          <CardHeader className="flex flex-col gap-3 items-center justify-center pt-6 pb-2">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex items-center justify-center mb-2"
            >
              <img src="/favicon.svg" alt="LimpeJá Logo" className="w-16 h-16 object-contain" />
            </motion.div>
            <div className="text-center">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                {isForgot ? 'Recuperar Senha' : (isRegister ? 'Criar sua conta' : 'Acessar sua conta')}
              </h2>
              <p className="text-sm text-slate-400 mt-1">Sistema de Gestão para Higienização</p>
            </div>
          </CardHeader>

          <CardBody className="overflow-visible py-4 px-4 sm:px-6">
            <AnimatePresence mode="wait">
              {(justVerified || tokenError) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium mb-4 ${justVerified ? 'bg-success-50/10 text-success-400 border border-success-500/20' : 'bg-danger-50/10 text-danger-400 border border-danger-500/20'}`}
                >
                  {justVerified ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                  {justVerified ? 'E-mail confirmado! Faça login para entrar.' : 'Link inválido ou expirado.'}
                </motion.div>
              )}
              
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium bg-danger-50/10 text-danger-400 border border-danger-500/20 mb-4"
                >
                  <AlertTriangle size={18} /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {isRegister && !isForgot && (
                  <motion.div initial="hidden" animate="visible" exit="exit" variants={fadeVariants}>
                    <Input
                      autoFocus
                      label="Nome Completo"
                      variant="faded"
                      placeholder="Ex: João da Silva"
                      value={name}
                      onValueChange={setName}
                      classNames={{ inputWrapper: "bg-slate-800/50 hover:bg-slate-800 border-slate-700/50", input: "!text-white" }}
                      isRequired
                    />
                  </motion.div>
                )}

                <motion.div layout initial="hidden" animate="visible" exit="exit" variants={fadeVariants}>
                  <Input
                    type="email"
                    label="E-mail"
                    variant="faded"
                    placeholder="seu@email.com"
                    value={email}
                    onValueChange={setEmail}
                    classNames={{ inputWrapper: "bg-slate-800/50 hover:bg-slate-800 border-slate-700/50", input: "!text-white" }}
                    isRequired
                  />
                </motion.div>

                {!isForgot && (
                  <motion.div layout initial="hidden" animate="visible" exit="exit" variants={fadeVariants}>
                    <Input
                      type="password"
                      label="Senha"
                      variant="faded"
                      placeholder="••••••••"
                      value={password}
                      onValueChange={setPassword}
                      classNames={{ inputWrapper: "bg-slate-800/50 hover:bg-slate-800 border-slate-700/50", input: "!text-white" }}
                      isRequired
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {!isForgot && !isRegister && (
                <div className="flex items-center justify-between mt-2">
                  <Checkbox defaultSelected size="sm" classNames={{ label: "text-slate-400 text-sm" }}>
                    Lembrar de mim
                  </Checkbox>
                  <HeroLink className="text-sm font-medium cursor-pointer" color="primary" onPress={() => setIsForgot(true)}>
                    Esqueceu a senha?
                  </HeroLink>
                </div>
              )}

              <Button 
                type="submit" 
                color="primary" 
                className="w-full mt-2 font-bold text-sm shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] transition-all bg-gradient-to-tr from-blue-600 to-indigo-500"
                size="lg"
                isLoading={loading}
                endContent={!loading && <ArrowRight size={18} />}
              >
                {isForgot ? 'Enviar Link de Recuperação' : (isRegister ? 'Criar Conta' : 'Acessar Conta')}
              </Button>

              <div className="text-center text-sm text-slate-400 mt-4">
                {isForgot ? (
                   <HeroLink color="foreground" className="font-medium cursor-pointer" onPress={() => setIsForgot(false)}>
                     Voltar ao Login
                   </HeroLink>
                ) : (
                  <>
                    {isRegister ? 'Já tem uma conta? ' : "Não tem uma conta? "}
                    <HeroLink color="primary" className="font-semibold cursor-pointer" onPress={() => setIsRegister(!isRegister)}>
                      {isRegister ? 'Fazer login' : 'Criar agora'}
                    </HeroLink>
                  </>
                )}
              </div>
            </form>
          </CardBody>
          
          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent my-2" />
          
          <div className="px-6 py-4 text-center flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase">🛡️ Enterprise-Grade Security</span>
            <span className="text-[11px] text-slate-500">Cloud Infrastructure & High Availability</span>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
