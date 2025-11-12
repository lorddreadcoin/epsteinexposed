'use client';

import { useState } from 'react';
import { Star, Phone, Mail, MapPin, Clock, Award, Shield, Sparkles, FileCheck, CheckCircle, ArrowRight, Calendar, BadgeCheck } from 'lucide-react';
import HeroSection from '@/components/HeroSection';
import AnimatedStats from '@/components/AnimatedStats';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import ServicesQuickView from '@/components/ServicesQuickView';
import ComprehensiveServices from '@/components/ComprehensiveServices';

export default function DesertEliteMotorworks() {
  const [activeTab, setActiveTab] = useState('hero');

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-black/95 backdrop-blur-md py-4 border-b border-zinc-800 shadow-2xl shadow-black/50">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img 
              src="/images/logo.png" 
              alt="Desert Elite Motorworks" 
              className="w-12 h-12 object-contain drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
            />
            <div>
              <div className="text-lg font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" 
                   style={{ textShadow: '0 2px 8px rgba(255,255,255,0.1), 0 4px 16px rgba(0,0,0,0.9)' }}>
                DESERT ELITE
              </div>
              <div className="text-xs tracking-widest font-semibold bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent animate-shimmer"
                   style={{ 
                     textShadow: '0 0 20px rgba(251,191,36,0.5), 0 0 40px rgba(251,191,36,0.3)',
                     backgroundSize: '200% auto',
                     animation: 'shimmer 3s linear infinite'
                   }}>
                MOTORWORKS
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <a href="#services" className="hover:text-amber-400 transition-all font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">Services</a>
            <a href="#credentials" className="hover:text-amber-400 transition-all font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">Credentials</a>
            <a href="#reviews" className="hover:text-amber-400 transition-all font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">Reviews</a>
            <a href="tel:+17608998244" className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black px-6 py-2 rounded-full font-bold transition-all shadow-lg shadow-amber-500/50 hover:shadow-xl hover:shadow-amber-500/70 hover:scale-105"
               style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
              (760) 899-8244
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section - NEW CINEMATIC VERSION */}
      <HeroSection />

      {/* Animated Stats - NEW */}
      <AnimatedStats />

      {/* Before/After Projects - NEW */}
      <section id="projects" className="py-32 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <p className="text-amber-400 text-sm font-semibold tracking-widest mb-4">TRANSFORMATIONS</p>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                Witness The Transformation
              </span>
            </h2>
            <p className="text-xl text-zinc-400 max-w-3xl mx-auto">
              From forgotten classics to concours-worthy masterpieces
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <BeforeAfterSlider
              before="https://images.unsplash.com/photo-1619405399517-d7fce0f13302?w=800&q=80"
              after="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80"
              title="1973 Porsche 911 Carrera"
              description="Complete frame-off restoration with period-correct details"
            />
            <BeforeAfterSlider
              before="https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80"
              after="https://images.unsplash.com/photo-1494905998402-395d579af36f?w=800&q=80"
              title="1967 Ford Mustang Fastback"
              description="Engine rebuild and suspension upgrade"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <BeforeAfterSlider
              before="https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80"
              after="https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80"
              title="1969 Chevrolet Camaro SS"
              description="Full restoration with modern performance upgrades"
            />
            <BeforeAfterSlider
              before="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80"
              after="https://images.unsplash.com/photo-1580414057403-c5f451f30740?w=800&q=80"
              title="1965 Mercedes-Benz 230SL"
              description="Restomod conversion with modern amenities"
            />
          </div>
        </div>
      </section>

      {/* Original Hero Content - now moved below */}
      <section className="pt-32 pb-20 px-6" style={{display: 'none'}}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xl text-zinc-400 mb-10 max-w-3xl mx-auto">
            Where uncompromising quality meets white-glove service. Elite restoration, custom builds, and luxury maintenance for discerning automotive enthusiasts.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a href="#contact" className="bg-amber-500 hover:bg-amber-600 text-black px-8 py-4 rounded-full font-bold flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Schedule Consultation</span>
            </a>
            <a href="tel:+17608998244" className="border-2 border-white/20 hover:border-amber-400 px-8 py-4 rounded-full font-bold flex items-center space-x-2">
              <Phone className="w-5 h-5" />
              <span>(760) 899-8244</span>
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
            <div className="flex items-center space-x-2">
              <BadgeCheck className="w-5 h-5 text-amber-400" />
              <span>CA BAR Licensed</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <span>Lifetime Warranty</span>
            </div>
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>ASE Certified</span>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>White Glove Service</span>
            </div>
          </div>
        </div>
      </section>

      {/* BAR License Credentials Section */}
      <section id="credentials" className="py-20 px-6 bg-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-semibold tracking-widest mb-4">CREDENTIALS & LICENSING</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Licensed & Certified Excellence</h2>
            <p className="text-xl text-zinc-400 max-w-3xl mx-auto">
              Fully licensed by the California Bureau of Automotive Repair, ensuring the highest standards of professional service.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* BAR License Card */}
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-2 border-amber-500/30 rounded-2xl p-8">
              <div className="flex items-start space-x-4 mb-6">
                <div className="w-16 h-16 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-8 h-8 text-black" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-amber-400">California BAR Licensed</h3>
                  <p className="text-zinc-400">Automotive Repair Dealer</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">License Number</span>
                  <span className="font-bold text-amber-400">ARD00306932</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Date Issued</span>
                  <span className="font-semibold">March 2022</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Valid Through</span>
                  <span className="font-semibold">March 2026</span>
                </div>
              </div>

              <p className="text-sm text-zinc-400 leading-relaxed">
                Licensed and registered automotive repair dealer authorized by the California Bureau of Automotive Repair to perform inspections, diagnostics, and mechanical repairs under the Automotive Repair Act.
              </p>
            </div>

            {/* Additional Credentials */}
            <div className="space-y-6">
              <div className="bg-zinc-800 rounded-2xl p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">ASE Certified</h4>
                    <p className="text-sm text-zinc-500">Master Technicians</p>
                  </div>
                </div>
                <p className="text-zinc-400 text-sm">
                  ASE certifications demonstrating mastery in diagnostics, engine repair, and electrical systems.
                </p>
              </div>

              <div className="bg-zinc-800 rounded-2xl p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">Lifetime Warranty</h4>
                    <p className="text-sm text-zinc-500">All Services</p>
                  </div>
                </div>
                <p className="text-zinc-400 text-sm">
                  Comprehensive lifetime warranty on all services performed, giving you complete peace of mind.
                </p>
              </div>

              <div className="bg-zinc-800 rounded-2xl p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">Specialized Training</h4>
                    <p className="text-sm text-zinc-500">European & Exotic Vehicles</p>
                  </div>
                </div>
                <p className="text-zinc-400 text-sm">
                  Factory-level training for Mercedes, BMW, Porsche, and other luxury marques.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-black border border-zinc-800 rounded-2xl p-8 text-center">
            <p className="text-lg text-zinc-300 leading-relaxed">
              Desert Elite Motorworks is a high-performance and luxury automotive service center specializing in diagnostics, mechanical repair, and full restoration for European, domestic, and performance vehicles.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Services Overview */}
      <ServicesQuickView />

      {/* Comprehensive Services Section */}
      <ComprehensiveServices />

      {/* Reviews */}
      <section id="reviews" className="py-20 px-6 bg-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-semibold tracking-widest mb-4">REVIEWS</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">What Our Clients Say</h2>
            
            <div className="inline-block bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl p-8 text-black max-w-md">
              <div className="flex items-center space-x-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-8 h-8 fill-black" />
                ))}
              </div>
              <div className="text-6xl font-bold mb-2">4.9</div>
              <div className="text-xl font-semibold">64 Google Reviews</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-zinc-800 rounded-xl p-6">
              <div className="flex space-x-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-zinc-300 mb-4">"As a single mom who needs her vehicle running, I TRULY appreciate Nick SO MUCH!!! He is honest, has the BEST rates, & always goes above and beyond."</p>
              <p className="font-semibold">— Elvia Ojeda</p>
            </div>

            <div className="bg-zinc-800 rounded-xl p-6">
              <div className="flex space-x-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-zinc-300 mb-4">"10/10 recommend!!!! Extremely satisfied with their service. They are affordable, reliable, and always get it done that same day!"</p>
              <p className="font-semibold">— Stephany Cuahuizo</p>
            </div>
          </div>

          <div className="text-center">
            <a href="https://www.google.com/maps/place/Nick's+Automotive/@33.7215154,-116.2069718,17z" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center space-x-2">
              <span>Read All 64 Five-Star Reviews</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-semibold tracking-widest mb-4">GET IN TOUCH</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Experience the Difference</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <a href="tel:+17608998244" className="flex items-start space-x-4 p-6 bg-zinc-900 rounded-xl hover:bg-zinc-800">
              <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 mb-1">Call Us</p>
                <p className="text-xl font-semibold">(760) 899-8244</p>
              </div>
            </a>

            <a href="mailto:info@desertelitemotorworks.com" className="flex items-start space-x-4 p-6 bg-zinc-900 rounded-xl hover:bg-zinc-800">
              <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 mb-1">Email Us</p>
                <p className="text-lg font-semibold break-all">info@desertelitemotorworks.com</p>
              </div>
            </a>

            <a href="https://www.google.com/maps/place/Nick's+Automotive/@33.7215154,-116.2069718,17z" target="_blank" rel="noopener noreferrer" className="flex items-start space-x-4 p-6 bg-zinc-900 rounded-xl hover:bg-zinc-800">
              <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 mb-1">Visit Us</p>
                <p className="text-lg font-semibold">83651 Avenue 45, Suite F</p>
                <p className="text-sm text-zinc-400">Indio, CA 92201</p>
              </div>
            </a>

            <div className="flex items-start space-x-4 p-6 bg-zinc-900 rounded-xl">
              <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 mb-1">Hours</p>
                <p className="text-lg font-semibold">Mon-Fri: 8AM-6PM</p>
                <p className="text-sm text-zinc-400">Sat: By Appointment</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6">Schedule Your Consultation</h3>
            <form className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input type="text" placeholder="Name" className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3" />
                <input type="tel" placeholder="Phone" className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3" />
              </div>
              <input type="email" placeholder="Email" className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3" />
              <input type="text" placeholder="Vehicle (Year, Make, Model)" className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3" />
              <textarea rows={4} placeholder="Tell us about your project..." className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3"></textarea>
              <button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-4 rounded-full flex items-center justify-center space-x-2">
                <span>Schedule Consultation</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 px-6 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg"></div>
                <div>
                  <div className="font-bold">DESERT ELITE</div>
                  <div className="text-xs text-amber-400">MOTORWORKS</div>
                </div>
              </div>
              <p className="text-sm text-zinc-500">Licensed automotive repair facility serving the Coachella Valley.</p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm text-zinc-500">
                <div><a href="#services">Services</a></div>
                <div><a href="#credentials">Credentials</a></div>
                <div><a href="#reviews">Reviews</a></div>
                <div><a href="#contact">Contact</a></div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">License Info</h4>
              <div className="text-sm text-zinc-500 space-y-1">
                <div>CA BAR License #ARD00306932</div>
                <div>Issued: March 2022</div>
                <div>Valid Through: March 2026</div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-900 text-center text-sm text-zinc-600">
            <p>© 2025 Desert Elite Motorworks. All rights reserved.</p>
            <p className="mt-2">83651 Avenue 45, Suite F, Indio, CA 92201 • (760) 899-8244</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
