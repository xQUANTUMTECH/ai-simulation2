import React from 'react';
import { Shield, Users, Brain, BookOpen, CheckCircle, ArrowRight, Play, 
  Zap, Award, Clock, BarChart, MessageSquare, Video, FileText, 
  Laptop, Globe, Lock } from 'lucide-react';

interface HomepageProps {
  isDarkMode: boolean;
}

export function Homepage({ isDarkMode }: HomepageProps) {
  return (
    <div className="space-y-20 py-12 px-4 md:px-6 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Formazione Professionale per
            <span className="block text-purple-500">Consulenti del Lavoro</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Piattaforma di e-learning specializzata per consulenti del lavoro. 
            Accedi a corsi professionali, aggiornamenti normativi e risorse esclusive.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-xl flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-purple-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Aggiornamenti Normativi</h3>
          <p className="text-gray-400">
            Contenuti sempre aggiornati sulle ultime normative del lavoro e della previdenza sociale.
          </p>
        </div>

        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Casi Pratici</h3>
          <p className="text-gray-400">
            Simulazioni e casi studio reali per applicare le conoscenze teoriche nella pratica quotidiana.
          </p>
        </div>

        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-xl flex items-center justify-center mb-4">
            <Brain className="w-6 h-6 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Supporto AI</h3>
          <p className="text-gray-400">
            Assistente AI specializzato per rispondere a domande e fornire chiarimenti immediati.
          </p>
        </div>
      </section>

      {/* Course Preview */}
      <section className={`rounded-2xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
        <div className="aspect-video relative">
          <img 
            src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=600&fit=crop" 
            alt="Corso in evidenza"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent flex items-end p-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Gestione Contratti di Lavoro 2024
              </h2>
              <p className="text-gray-300">
                Corso completo sulle novità contrattuali e le best practice per la gestione dei rapporti di lavoro.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Process */}
      <section className="text-center space-y-12">
        <h2 className="text-3xl font-bold">Come Funziona</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { icon: <BookOpen size={32} />, title: "1. Scegli il Corso", text: "Seleziona il corso più adatto alle tue esigenze" },
            { icon: <Video size={32} />, title: "2. Guarda le Lezioni", text: "Accedi ai contenuti video e materiali didattici" },
            { icon: <FileText size={32} />, title: "3. Metti in Pratica", text: "Applica le conoscenze con esercitazioni pratiche" },
            { icon: <Award size={32} />, title: "4. Ottieni il Certificato", text: "Completa il corso e ricevi la certificazione" }
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-purple-500 bg-opacity-20 flex items-center justify-center text-purple-500">
                {step.icon}
              </div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-gray-400">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-3xl font-bold mb-8">
            Perché Scegliere la Nostra Piattaforma
          </h2>
          <div className="space-y-6">
            {[
              { title: 'Formazione Certificata', description: 'Corsi riconosciuti per i crediti formativi obbligatori.' },
              { title: 'Flessibilità Totale', description: 'Accesso 24/7 da qualsiasi dispositivo, studia quando vuoi.' },
              { title: 'Contenuti Premium', description: 'Materiale didattico creato da esperti del settore.' },
              { title: 'Supporto Dedicato', description: 'Assistenza tecnica e didattica sempre disponibile.' }
            ].map((benefit, index) => (
              <div key={index} className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-purple-500 bg-opacity-20 flex-shrink-0 flex items-center justify-center">
                  <CheckCircle size={16} className="text-purple-500" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">{benefit.title}</h3>
                  <p className="text-gray-400">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <img 
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=1000&fit=crop" 
            alt="Team al lavoro"
            className="rounded-2xl"
          />
          <div className={`absolute -bottom-8 -left-8 p-6 rounded-xl border ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium">Corsi Completati</h4>
                <p className="text-2xl font-bold">2,500+</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium">Professionisti Formati</h4>
                <p className="text-2xl font-bold">1,200+</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="text-center space-y-12">
        <h2 className="text-3xl font-bold">Caratteristiche Principali</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Laptop className="text-purple-500" size={32} />,
              title: "Piattaforma Intuitiva",
              features: ["Interfaccia user-friendly", "Navigazione semplice", "Dashboard personalizzata"]
            },
            {
              icon: <Globe className="text-blue-500" size={32} />,
              title: "Accesso Ovunque",
              features: ["Disponibile 24/7", "Multi-dispositivo", "Modalità offline"]
            },
            {
              icon: <Lock className="text-green-500" size={32} />,
              title: "Sicurezza Garantita",
              features: ["Dati protetti", "Accesso sicuro", "Backup automatici"]
            }
          ].map((feature, i) => (
            <div key={i} className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
              <ul className="space-y-2">
                {feature.features.map((f, j) => (
                  <li key={j} className="text-gray-400">{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { icon: <Clock size={32} />, value: "45+", label: "Ore di Contenuti" },
          { icon: <BookOpen size={32} />, value: "30+", label: "Corsi Disponibili" },
          { icon: <Users size={32} />, value: "1000+", label: "Studenti Attivi" },
          { icon: <Award size={32} />, value: "95%", label: "Tasso di Successo" }
        ].map((stat, i) => (
          <div key={i} className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} text-center`}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500 bg-opacity-20 flex items-center justify-center text-purple-500">
              {stat.icon}
            </div>
            <p className="text-3xl font-bold mb-2">{stat.value}</p>
            <p className="text-gray-400">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="text-center space-y-6">
        <h2 className="text-3xl font-bold">
          Pronto per Iniziare?
        </h2>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Unisciti a migliaia di professionisti che hanno scelto la nostra piattaforma per la loro formazione continua.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="/register" 
            className="px-8 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
          >
            Inizia Gratuitamente
            <ArrowRight size={20} />
          </a>
        </div>
      </section>
    </div>
  );
}
